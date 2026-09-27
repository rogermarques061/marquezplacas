-- Recomendações do verificador de segurança do Supabase.

-- search_path fixo
alter function public.temperatura_por_site(public.tem_site) set search_path = public;
alter function public.vendas_before_update() set search_path = public;
alter function public.vendas_before_insert() set search_path = public;

-- Funções de trigger não devem ser chamáveis pela API (/rest/v1/rpc/...).
-- Triggers continuam disparando normalmente: o Postgres não checa EXECUTE ao disparar.
revoke execute on function public.handle_new_user()      from public, anon, authenticated;
revoke execute on function public.proteger_papel()       from public, anon, authenticated;
revoke execute on function public.vendas_sync_lead()     from public, anon, authenticated;
revoke execute on function public.leads_before_update()  from public, anon, authenticated;
revoke execute on function public.notificar_nova_venda() from public, anon, authenticated;
revoke execute on function public.vendas_before_update() from public, anon, authenticated;
revoke execute on function public.vendas_before_insert() from public, anon, authenticated;

-- is_admin/is_membro: usados nas policies de quem está logado; anônimo não precisa.
revoke execute on function public.is_admin()  from public, anon;
revoke execute on function public.is_membro() from public, anon;
grant execute on function public.is_admin()  to authenticated;
grant execute on function public.is_membro() to authenticated;

-- enviar_formulario continua público de propósito: é a porta do formulário.
