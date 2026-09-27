-- As Edge Functions leem a configuração de push do Vault (em vez de secrets da CLI),
-- assim tudo se configura pelo SQL Editor. Só a service role (usada pelas funções) acessa.
--
--   select vault.create_secret('<chave pública VAPID>',  'vapid_publica');
--   select vault.create_secret('<chave privada VAPID>',  'vapid_privada');
--   select vault.create_secret('mailto:voce@dominio',    'vapid_contato');
--   (notificar_venda_url e notificar_venda_segredo: ver migração 4)
create or replace function public.config_push()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select coalesce(jsonb_object_agg(name, decrypted_secret), '{}'::jsonb)
  from vault.decrypted_secrets
  where name in ('vapid_publica', 'vapid_privada', 'vapid_contato', 'notificar_venda_segredo');
$$;

revoke execute on function public.config_push() from public, anon, authenticated;
grant execute on function public.config_push() to service_role;
