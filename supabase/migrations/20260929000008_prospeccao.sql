-- =====================================================================
-- Prospecção: negócios encontrados na busca (OpenStreetMap) ou cadastrados
-- à mão, trabalhados em dois canais:
--   rua  → rota de visitas porta a porta
--   x1   → mensagem direta no WhatsApp
-- =====================================================================

create table public.rotas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  centro_lat  double precision,
  centro_lng  double precision,
  created_at  timestamptz not null default now()
);

create table public.prospectos (
  id            uuid primary key default gen_random_uuid(),
  canal         text not null check (canal in ('rua', 'x1')),
  fonte         text not null default 'osm' check (fonte in ('osm', 'manual')),
  fonte_id      text,                         -- ex.: node/123 no OpenStreetMap
  nome          text not null check (char_length(nome) between 1 and 160),
  nicho         text not null check (nicho in ('restaurante', 'nail', 'estetica', 'salao', 'sobrancelha', 'barbearia', 'tatuador', 'otica', 'outro')),
  endereco      text,
  lat           double precision,
  lng           double precision,
  telefone      text,                         -- só dígitos, com DDD
  instagram     text,
  site          text,
  status        text not null default 'novo' check (status in ('novo', 'contatado', 'interessado', 'vendido', 'sem_interesse')),
  rota_id       uuid references public.rotas (id) on delete set null,
  ordem_rota    integer,
  anotacoes     text,
  contatado_em  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (canal, fonte_id)
);

create index prospectos_canal_status_idx on public.prospectos (canal, status);
create index prospectos_rota_idx on public.prospectos (rota_id, ordem_rota);

create or replace function public.prospectos_before_update()
returns trigger
language plpgsql set search_path = public
as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status and new.status <> 'novo' and new.contatado_em is null then
    new.contatado_em := now();
  end if;
  return new;
end;
$$;

create trigger prospectos_before_update
  before update on public.prospectos
  for each row execute function public.prospectos_before_update();

revoke execute on function public.prospectos_before_update() from public, anon, authenticated;

-- Preferências simples do app (ex.: textos de mensagem do X1)
create table public.configuracoes (
  chave       text primary key,
  valor       jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.rotas enable row level security;
alter table public.prospectos enable row level security;
alter table public.configuracoes enable row level security;

create policy "membros usam rotas" on public.rotas for all to authenticated
  using (public.is_membro()) with check (public.is_membro());
create policy "membros usam prospectos" on public.prospectos for all to authenticated
  using (public.is_membro()) with check (public.is_membro());
create policy "membros usam configuracoes" on public.configuracoes for all to authenticated
  using (public.is_membro()) with check (public.is_membro());
