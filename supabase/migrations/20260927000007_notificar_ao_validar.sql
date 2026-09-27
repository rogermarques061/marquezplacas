-- Notificação passa a sair quando a venda é VALIDADA (aí já existe o valor),
-- com mensagens que mudam a cada venda e comemoram as metas do dia.

drop trigger if exists vendas_notificar on public.vendas;

-- Venda manual já cadastrada como validada
create trigger vendas_notificar_insert
  after insert on public.vendas
  for each row
  when (new.status_venda = 'validada')
  execute function public.notificar_nova_venda();

-- Venda pendente (formulário) que acabou de ser validada
create trigger vendas_notificar_validacao
  after update of status_venda on public.vendas
  for each row
  when (old.status_venda is distinct from 'validada' and new.status_venda = 'validada')
  execute function public.notificar_nova_venda();

-- O corpo do aviso é montado na Edge Function; o trigger só manda o id.
create or replace function public.notificar_nova_venda()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_url text;
  v_segredo text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'notificar_venda_url';
  select decrypted_secret into v_segredo from vault.decrypted_secrets where name = 'notificar_venda_segredo';
  if v_url is null or v_segredo is null then
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-segredo', v_segredo),
    body := jsonb_build_object('venda_id', new.id)
  );
  return new;
exception when others then
  -- Notificação nunca pode impedir o cadastro/validação da venda.
  raise warning 'notificar_nova_venda: %', sqlerrm;
  return new;
end;
$$;

revoke execute on function public.notificar_nova_venda() from public, anon, authenticated;

-- Tudo que a mensagem precisa, com "hoje" no fuso de São Paulo.
create or replace function public.dados_notificacao(p_venda_id uuid)
returns jsonb
language sql stable security definer set search_path = public
as $$
  with venda as (
    select v.*, p.nome as vendedor_nome,
           (v.validada_em at time zone 'America/Sao_Paulo')::date as dia
    from public.vendas v
    left join public.profiles p on p.id = v.vendedor_id
    where v.id = p_venda_id
  ),
  dia as (
    select coalesce(sum(x.valor_total), 0) as total_dia,
           count(*) as vendas_dia
    from public.vendas x, venda
    where x.status_venda = 'validada'
      and (x.validada_em at time zone 'America/Sao_Paulo')::date = venda.dia
      and x.validada_em <= venda.validada_em
  )
  select jsonb_build_object(
    'venda_id', venda.id,
    'nome', venda.nome,
    'valor', venda.valor_total,
    'tipo_venda', venda.tipo_venda,
    'quantidade', venda.quantidade,
    'vendedor', venda.vendedor_nome,
    'total_dia', dia.total_dia,
    'vendas_dia', dia.vendas_dia
  )
  from venda, dia;
$$;

revoke execute on function public.dados_notificacao(uuid) from public, anon, authenticated;
grant execute on function public.dados_notificacao(uuid) to service_role;
