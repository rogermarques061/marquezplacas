-- =====================================================================
-- Notificações push: a cada formulário enviado, o banco chama a Edge
-- Function "notificar-venda", que manda o Web Push para todos os usuários
-- com notificações ativas.
--
-- Configuração (uma vez, no SQL Editor), trocando pelos seus valores:
--   select vault.create_secret('https://SEU-PROJETO.supabase.co/functions/v1/notificar-venda', 'notificar_venda_url');
--   select vault.create_secret('UMA-SENHA-LONGA-ALEATORIA', 'notificar_venda_segredo');
-- O mesmo segredo vai na Edge Function: supabase secrets set NOTIFICAR_SEGREDO=...
-- =====================================================================

create extension if not exists pg_net with schema extensions;

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

  -- Sem configuração, a venda entra normalmente, só não notifica.
  if v_url is null or v_segredo is null then
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-segredo', v_segredo),
    body := jsonb_build_object('venda_id', new.id, 'nome', new.nome, 'segmento', new.segmento)
  );
  return new;
exception when others then
  -- Notificação nunca pode impedir o cadastro da venda.
  raise warning 'notificar_nova_venda: %', sqlerrm;
  return new;
end;
$$;

create trigger vendas_notificar
  after insert on public.vendas
  for each row
  when (new.origem = 'formulario')
  execute function public.notificar_nova_venda();
