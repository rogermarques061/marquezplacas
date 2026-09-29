-- Servidores do Overpass em ordem de confiabilidade (testados do banco):
-- os endereços alternativos do overpass-api.de (z, lz4) costumam estar menos
-- lotados que o principal. Com a consulta leve (bbox), cada um responde em segundos.
create or replace function public.consultar_overpass(p_consulta text)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
set statement_timeout = '60s'
as $$
declare
  v_chave text := md5(p_consulta);
  v_cache jsonb;
  v_resp extensions.http_response;
  v_url text;
  v_falhas text := '';
begin
  select resposta into v_cache from public.cache_overpass
  where chave = v_chave and criado_em > now() - interval '7 days';
  if v_cache is not null then
    return v_cache;
  end if;

  foreach v_url in array array[
    'https://z.overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
  ] loop
    begin
      perform extensions.http_set_curlopt('CURLOPT_CONNECTTIMEOUT_MS', '4000');
      perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '14000');
      select * into v_resp from extensions.http((
        'GET',
        v_url || '?data=' || extensions.urlencode(p_consulta),
        array[extensions.http_header('User-Agent', 'MarquezPlacas/1.0 (prospeccao; contato@marquez.digital)')],
        null, null
      )::extensions.http_request);

      if v_resp.status = 200 then
        insert into public.cache_overpass (chave, resposta) values (v_chave, v_resp.content::jsonb)
        on conflict (chave) do update set resposta = excluded.resposta, criado_em = now();
        delete from public.cache_overpass where criado_em < now() - interval '7 days';
        return v_resp.content::jsonb;
      end if;
      v_falhas := v_falhas || ' ' || v_resp.status;
    exception when others then
      v_falhas := v_falhas || ' erro';
    end;
  end loop;

  raise exception 'servidores de mapa indisponíveis:%', v_falhas;
end;
$$;

revoke execute on function public.consultar_overpass(text) from public, anon, authenticated;
grant execute on function public.consultar_overpass(text) to service_role;
