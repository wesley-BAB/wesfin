-- =====================================================================
-- WESFIN - migração 002
--  1. Categorias passam a ser de cada usuário (não mais da conta)
--  2. Tabela de administradores + usuário admin "wesley"
-- Execute no Supabase: SQL Editor > New query > cole tudo > Run
-- =====================================================================

-- ---------- 1. Categorias por usuário ----------
alter table public.categorias
  add column if not exists usuario_id uuid references public.usuarios(id) on delete cascade;

-- As categorias existentes passam a pertencer ao dono da conta em que estavam.
update public.categorias c
   set usuario_id = ct.dono_id
  from public.contas ct
 where c.conta_id = ct.id
   and c.usuario_id is null;

-- Quem tinha mais de uma conta fica com categorias repetidas: mantém a mais
-- antiga e repassa os lançamentos e contas mensais para ela.
with mantida as (
  select c.id,
         first_value(c.id) over (partition by c.usuario_id, lower(c.nome) order by c.criado_em, c.id) as manter
    from public.categorias c
)
update public.transacoes t
   set categoria_id = m.manter
  from mantida m
 where t.categoria_id = m.id and m.id <> m.manter;

with mantida as (
  select c.id,
         first_value(c.id) over (partition by c.usuario_id, lower(c.nome) order by c.criado_em, c.id) as manter
    from public.categorias c
)
update public.recorrencias r
   set categoria_id = m.manter
  from mantida m
 where r.categoria_id = m.id and m.id <> m.manter;

with mantida as (
  select c.id,
         first_value(c.id) over (partition by c.usuario_id, lower(c.nome) order by c.criado_em, c.id) as manter
    from public.categorias c
)
delete from public.categorias c
 using mantida m
 where c.id = m.id and m.id <> m.manter;

delete from public.categorias where usuario_id is null;

alter table public.categorias alter column usuario_id set not null;
drop index if exists public.categorias_conta_nome_idx;
alter table public.categorias drop column if exists conta_id;
create unique index if not exists categorias_usuario_nome_idx on public.categorias (usuario_id, lower(nome));

-- ---------- 2. Administradores ----------
create table if not exists public.administradores (
  id            uuid primary key default gen_random_uuid(),
  usuario       text not null unique,
  senha_hash    text not null,          -- scrypt (gerado por scripts/hash-senha.js)
  criado_em     timestamptz not null default now(),
  ultimo_login  timestamptz
);
alter table public.administradores enable row level security;

insert into public.administradores (usuario, senha_hash)
values ('wesley', 'scrypt$4119601e55ac06989bee1dc1a5828fe1$7332fd352aabbe2327a5b4b66b4603afa7b6300f0a95643650e623e421930a51a9713c39082aeab91e940235bdf54d67b8dcdaf716bdc459a07bd194e298a419')
on conflict (usuario) do update set senha_hash = excluded.senha_hash;
