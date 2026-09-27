-- =====================================================================
-- Marquez Placas — schema inicial
-- Tabelas: profiles, vendas, leads, lead_historico, push_subscriptions
-- Todas com Row Level Security.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos (enums)
-- ---------------------------------------------------------------------
create type public.papel_usuario   as enum ('admin', 'vendedor');
create type public.segmento        as enum ('alimentacao', 'beleza_estetica', 'saude', 'loja_varejo', 'servicos', 'outro');
create type public.tem_site        as enum ('sim_funciona', 'sim_desatualizado', 'nao_tem');
create type public.como_encontram  as enum ('indicacao', 'instagram', 'google', 'passam_na_frente', 'outro');
create type public.tipo_venda      as enum ('unidade', 'kit');
create type public.forma_pagamento as enum ('pix', 'dinheiro', 'cartao', 'outro');
create type public.status_pagamento as enum ('pago', 'aguardando');
create type public.status_venda    as enum ('pendente', 'validada', 'cancelada');
create type public.origem_venda    as enum ('formulario', 'manual');
create type public.etapa_lead      as enum (
  'comprou_plaquinha', 'reuniao_agendada', 'reuniao_realizada',
  'proposta_enviada', 'fechou_site', 'manutencao_ativa', 'perdido'
);
create type public.temperatura_lead as enum ('quente', 'morno', 'frio');

-- ---------------------------------------------------------------------
-- profiles (1:1 com auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  nome                text not null default '',
  email               text,
  papel               public.papel_usuario not null default 'vendedor',
  notificacoes_ativas boolean not null default false,
  created_at          timestamptz not null default now()
);

-- Helpers usados nas policies. SECURITY DEFINER evita recursão de RLS em profiles.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and papel = 'admin');
$$;

create or replace function public.is_membro()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

-- Cria o profile automaticamente quando um usuário é criado/convidado.
-- O primeiro usuário do sistema vira admin; os demais entram como vendedor
-- (o admin promove depois, se quiser).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    new.email,
    case when exists (select 1 from public.profiles) then 'vendedor'::public.papel_usuario
         else 'admin'::public.papel_usuario end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Só admin pode mudar o papel de alguém (inclusive o próprio).
create or replace function public.proteger_papel()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.papel is distinct from old.papel
     and auth.uid() is not null          -- service role / SQL direto passam
     and not public.is_admin() then
    raise exception 'Apenas administradores podem alterar papéis';
  end if;
  return new;
end;
$$;

create trigger profiles_proteger_papel
  before update on public.profiles
  for each row execute function public.proteger_papel();

alter table public.profiles enable row level security;

create policy "membros veem todos os perfis"
  on public.profiles for select to authenticated
  using (public.is_membro());

create policy "usuario edita o proprio perfil"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "admin edita qualquer perfil"
  on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "admin remove perfis"
  on public.profiles for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- vendas
-- ---------------------------------------------------------------------
create table public.vendas (
  id                uuid primary key default gen_random_uuid(),
  origem            public.origem_venda not null default 'formulario',

  -- dados do comprador (formulário)
  nome              text not null check (char_length(nome) between 2 and 120),
  whatsapp          text not null check (whatsapp ~ '^[0-9]{10,11}$'),  -- só dígitos, com DDD
  instagram         text check (instagram is null or char_length(instagram) <= 60),
  segmento          public.segmento,
  tem_site          public.tem_site,
  como_encontram    public.como_encontram,
  aceite_contato    boolean not null default false,

  -- dados preenchidos/validados pelo vendedor
  tipo_venda        public.tipo_venda,
  quantidade        integer check (quantidade is null or quantidade > 0),
  total_plaquinhas  integer generated always as (
                      case tipo_venda when 'kit' then quantidade * 2
                                      when 'unidade' then quantidade end
                    ) stored,
  valor_total       numeric(10,2) check (valor_total is null or valor_total >= 0),
  forma_pagamento   public.forma_pagamento,
  status_pagamento  public.status_pagamento not null default 'aguardando',
  status_venda      public.status_venda not null default 'pendente',
  vendedor_id       uuid references public.profiles (id) on delete set null,
  observacoes       text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  validada_em       timestamptz,
  cancelada_em      timestamptz,

  -- uma venda validada precisa estar completa
  constraint venda_validada_completa check (
    status_venda <> 'validada'
    or (tipo_venda is not null and quantidade is not null
        and valor_total is not null and forma_pagamento is not null)
  )
);

create index vendas_status_idx      on public.vendas (status_venda, created_at desc);
create index vendas_validada_em_idx on public.vendas (validada_em) where status_venda = 'validada';
create index vendas_vendedor_idx    on public.vendas (vendedor_id);

create or replace function public.vendas_before_update()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if new.status_venda is distinct from old.status_venda then
    new.validada_em  := case when new.status_venda = 'validada'  then now() end;
    new.cancelada_em := case when new.status_venda = 'cancelada' then now() end;
  end if;
  return new;
end;
$$;

create trigger vendas_before_update
  before update on public.vendas
  for each row execute function public.vendas_before_update();

alter table public.vendas enable row level security;

-- Público (anon) NÃO acessa a tabela: o formulário usa a função enviar_formulario().
create policy "membros veem vendas"
  on public.vendas for select to authenticated
  using (public.is_membro());

create policy "membros criam vendas manuais"
  on public.vendas for insert to authenticated
  with check (public.is_membro());

create policy "membros editam vendas"
  on public.vendas for update to authenticated
  using (public.is_membro()) with check (public.is_membro());

create policy "admin exclui vendas"
  on public.vendas for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- Formulário público: única porta de entrada para anon.
-- Força status pendente e não devolve nenhum dado sensível.
-- ---------------------------------------------------------------------
create or replace function public.enviar_formulario(
  p_nome           text,
  p_whatsapp       text,
  p_instagram      text,
  p_segmento       public.segmento,
  p_tem_site       public.tem_site,
  p_como_encontram public.como_encontram,
  p_aceite_contato boolean
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
  v_whatsapp text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
  v_instagram text := nullif(ltrim(trim(coalesce(p_instagram, '')), '@'), '');
begin
  if coalesce(p_aceite_contato, false) is not true then
    raise exception 'É preciso aceitar o contato pelo WhatsApp';
  end if;
  if char_length(trim(coalesce(p_nome, ''))) < 2 then
    raise exception 'Nome inválido';
  end if;
  if v_whatsapp !~ '^[0-9]{10,11}$' then
    raise exception 'WhatsApp inválido';
  end if;

  insert into public.vendas (origem, nome, whatsapp, instagram, segmento, tem_site,
                             como_encontram, aceite_contato, status_venda)
  values ('formulario', trim(p_nome), v_whatsapp, v_instagram, p_segmento, p_tem_site,
          p_como_encontram, true, 'pendente')
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.enviar_formulario from public;
grant execute on function public.enviar_formulario to anon, authenticated;

-- ---------------------------------------------------------------------
-- leads (funil pós-venda) — criado automaticamente ao validar a venda
-- ---------------------------------------------------------------------
create table public.leads (
  id               uuid primary key default gen_random_uuid(),
  venda_id         uuid not null unique references public.vendas (id) on delete cascade,
  etapa            public.etapa_lead not null default 'comprou_plaquinha',
  temperatura      public.temperatura_lead not null default 'morno',
  responsavel_id   uuid references public.profiles (id) on delete set null,
  data_reuniao     timestamptz,
  valor_site       numeric(10,2) not null default 647,
  valor_manutencao numeric(10,2) not null default 97,
  manutencao_ativa boolean not null default false,
  site_fechado_em  timestamptz,
  manutencao_desde timestamptz,
  anotacoes        text,
  posicao          double precision not null default 0,  -- ordem dentro da coluna do Kanban
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index leads_etapa_idx on public.leads (etapa, posicao);

create table public.lead_historico (
  id             uuid primary key default gen_random_uuid(),
  lead_id        uuid not null references public.leads (id) on delete cascade,
  etapa_anterior public.etapa_lead,
  etapa_nova     public.etapa_lead not null,
  usuario_id     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);

create index lead_historico_lead_idx on public.lead_historico (lead_id, created_at);

create or replace function public.temperatura_por_site(p public.tem_site)
returns public.temperatura_lead
language sql immutable
as $$
  select case p when 'nao_tem'           then 'quente'::public.temperatura_lead
                when 'sim_desatualizado' then 'morno'::public.temperatura_lead
                when 'sim_funciona'      then 'frio'::public.temperatura_lead
                else 'morno'::public.temperatura_lead end;
$$;

-- Venda validada => cria lead. Venda cancelada => remove lead que ainda não andou no funil.
create or replace function public.vendas_sync_lead()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_lead_id uuid;
begin
  if new.status_venda = 'validada'
     and (tg_op = 'INSERT' or old.status_venda is distinct from 'validada') then
    insert into public.leads (venda_id, temperatura, responsavel_id)
    values (new.id, public.temperatura_por_site(new.tem_site), new.vendedor_id)
    on conflict (venda_id) do nothing
    returning id into v_lead_id;

    if v_lead_id is not null then
      insert into public.lead_historico (lead_id, etapa_anterior, etapa_nova, usuario_id)
      values (v_lead_id, null, 'comprou_plaquinha', auth.uid());
    end if;
  elsif tg_op = 'UPDATE' and new.status_venda = 'cancelada' and old.status_venda = 'validada' then
    delete from public.leads where venda_id = new.id and etapa = 'comprou_plaquinha';
  end if;
  return new;
end;
$$;

create trigger vendas_sync_lead
  after insert or update of status_venda on public.vendas
  for each row execute function public.vendas_sync_lead();

-- Mudança de etapa => histórico + datas do pós-venda.
create or replace function public.leads_before_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.updated_at := now();

  if new.etapa is distinct from old.etapa then
    insert into public.lead_historico (lead_id, etapa_anterior, etapa_nova, usuario_id)
    values (new.id, old.etapa, new.etapa, auth.uid());

    if new.etapa in ('fechou_site', 'manutencao_ativa') and new.site_fechado_em is null then
      new.site_fechado_em := now();
    end if;
    if new.etapa = 'manutencao_ativa' then
      new.manutencao_ativa := true;
    end if;
  end if;

  if new.manutencao_ativa and not old.manutencao_ativa then
    new.manutencao_desde := now();
  elsif not new.manutencao_ativa then
    new.manutencao_desde := null;
  end if;

  return new;
end;
$$;

create trigger leads_before_update
  before update on public.leads
  for each row execute function public.leads_before_update();

alter table public.leads enable row level security;
alter table public.lead_historico enable row level security;

create policy "membros veem leads"
  on public.leads for select to authenticated using (public.is_membro());
create policy "membros editam leads"
  on public.leads for update to authenticated
  using (public.is_membro()) with check (public.is_membro());
create policy "admin exclui leads"
  on public.leads for delete to authenticated using (public.is_admin());

-- Histórico é só leitura para o app; quem escreve são os triggers.
create policy "membros veem historico"
  on public.lead_historico for select to authenticated using (public.is_membro());

-- ---------------------------------------------------------------------
-- push_subscriptions (um registro por aparelho)
-- ---------------------------------------------------------------------
create table public.push_subscriptions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  endpoint          text not null unique,
  subscription_json jsonb not null,
  user_agent        text,
  created_at        timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "usuario gerencia os proprios aparelhos"
  on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Realtime: painel recebe vendas/leads novos sem recarregar
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.vendas, public.leads;
