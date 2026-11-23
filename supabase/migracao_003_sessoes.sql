-- =====================================================================
-- WESFIN - migração 003
-- Sessões 100% no banco de dados (nada guardado no navegador além de um
-- identificador aleatório em cookie HttpOnly), tentativas de login do admin
-- e preferências do usuário (conta atual, visão do período).
-- Execute no Supabase: SQL Editor > New query > cole tudo > Run
-- =====================================================================

create table if not exists public.sessoes (
  id           uuid primary key default gen_random_uuid(),
  token_hash   text not null unique,                 -- SHA-256 do identificador; o valor puro nunca é gravado
  tipo         text not null check (tipo in ('usuario', 'admin')),
  usuario_id   uuid references public.usuarios(id) on delete cascade,
  admin_id     uuid references public.administradores(id) on delete cascade,
  criado_em    timestamptz not null default now(),
  ultimo_uso   timestamptz not null default now(),
  expira_em    timestamptz not null,
  revogada_em  timestamptz,
  ip           text,
  user_agent   text,
  check ((tipo = 'usuario' and usuario_id is not null) or (tipo = 'admin' and admin_id is not null))
);
create index if not exists sessoes_usuario_idx on public.sessoes (usuario_id);
create index if not exists sessoes_expira_idx on public.sessoes (expira_em);

create table if not exists public.tentativas_login (
  id         bigint generated always as identity primary key,
  ip         text not null,
  usuario    text,
  sucesso    boolean not null,
  criado_em  timestamptz not null default now()
);
create index if not exists tentativas_login_ip_idx on public.tentativas_login (ip, criado_em desc);

alter table public.usuarios add column if not exists preferencias jsonb not null default '{}'::jsonb;

alter table public.sessoes          enable row level security;
alter table public.tentativas_login enable row level security;
