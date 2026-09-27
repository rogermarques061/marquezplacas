-- Venda manual já cadastrada como validada precisa de validada_em
-- (o trigger de update não roda no insert).
create or replace function public.vendas_before_insert()
returns trigger
language plpgsql
as $$
begin
  if new.status_venda = 'validada' then new.validada_em := coalesce(new.validada_em, now()); end if;
  if new.status_venda = 'cancelada' then new.cancelada_em := coalesce(new.cancelada_em, now()); end if;
  return new;
end;
$$;

create trigger vendas_before_insert
  before insert on public.vendas
  for each row execute function public.vendas_before_insert();
