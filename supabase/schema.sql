-- =====================================================================
-- WESFIN - schema do banco (Supabase / PostgreSQL)
-- Execute no Supabase: SQL Editor > New query > cole tudo > Run
--
-- A autenticação NÃO usa o Supabase Auth. Os usuários ficam na tabela
-- public.usuarios e o login é validado pelo backend com o Google.
-- O backend acessa o banco com a service_role key; o RLS fica ligado
-- sem políticas, bloqueando qualquer acesso direto com a anon key.
-- =====================================================================

create extension if not exists pgcrypto;

-- Usuários (login com Google)
create table if not exists public.usuarios (
  id            uuid primary key default gen_random_uuid(),
  google_sub    text not null unique,          -- id único da conta Google
  email         text not null unique,
  nome          text,
  foto_url      text,
  preferencias  jsonb not null default '{}'::jsonb,   -- conta atual, visão do período
  criado_em     timestamptz not null default now(),
  ultimo_login  timestamptz
);

-- Contas financeiras (uma "carteira" que pode ser compartilhada)
create table if not exists public.contas (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  dono_id    uuid not null references public.usuarios(id) on delete cascade,
  criado_em  timestamptz not null default now()
);

-- Quem tem acesso a cada conta. Convites ficam com usuario_id nulo até
-- a pessoa fazer o primeiro login com aquele Gmail.
create table if not exists public.conta_membros (
  id          uuid primary key default gen_random_uuid(),
  conta_id    uuid not null references public.contas(id) on delete cascade,
  email       text not null,
  usuario_id  uuid references public.usuarios(id) on delete cascade,
  papel       text not null default 'editor' check (papel in ('dono', 'editor')),
  criado_em   timestamptz not null default now(),
  unique (conta_id, email)
);
create index if not exists conta_membros_usuario_idx on public.conta_membros (usuario_id);
create index if not exists conta_membros_email_idx on public.conta_membros (email);

-- Categorias (cada usuário tem as suas)
create table if not exists public.categorias (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.usuarios(id) on delete cascade,
  nome        text not null,
  tipo        text not null default 'saida' check (tipo in ('entrada', 'saida', 'ambos', 'investimento')),
  cor         text not null default '#2a78d6',
  criado_em   timestamptz not null default now()
);
create unique index if not exists categorias_usuario_nome_idx on public.categorias (usuario_id, lower(nome));

-- Contas mensais / lançamentos fixos (modelo que gera um lançamento por mês)
create table if not exists public.recorrencias (
  id              uuid primary key default gen_random_uuid(),
  conta_id        uuid not null references public.contas(id) on delete cascade,
  tipo            text not null check (tipo in ('entrada', 'saida', 'investimento')),
  descricao       text not null,
  valor           numeric(14, 2) not null check (valor > 0),
  categoria_id    uuid references public.categorias(id) on delete set null,
  dia_vencimento  int not null check (dia_vencimento between 1 and 31),
  inicio          date not null,               -- primeiro dia do mês inicial
  fim             date,                        -- último mês (opcional)
  gerado_ate      date,                        -- último mês já gerado
  ativo           boolean not null default true,
  criado_por      uuid references public.usuarios(id) on delete set null,
  criado_em       timestamptz not null default now()
);
create index if not exists recorrencias_conta_idx on public.recorrencias (conta_id);

-- Lançamentos (entradas, saídas e investimentos)
create table if not exists public.transacoes (
  id              uuid primary key default gen_random_uuid(),
  conta_id        uuid not null references public.contas(id) on delete cascade,
  tipo            text not null check (tipo in ('entrada', 'saida', 'investimento')),
  descricao       text not null,
  valor           numeric(14, 2) not null check (valor > 0),
  categoria_id    uuid references public.categorias(id) on delete set null,
  data            timestamptz not null default now(),   -- data/hora da transação ou vencimento
  status          text not null default 'pago' check (status in ('pago', 'a_pagar')),
  pago_em         timestamptz,
  recorrencia_id  uuid references public.recorrencias(id) on delete set null,
  competencia     date,                                   -- mês de referência (contas mensais)
  origem          text not null default 'manual' check (origem in ('manual', 'chat', 'recorrencia')),
  criado_por      uuid references public.usuarios(id) on delete set null,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  unique (recorrencia_id, competencia)
);
create index if not exists transacoes_conta_data_idx on public.transacoes (conta_id, data desc);
create index if not exists transacoes_pendentes_idx on public.transacoes (conta_id, status, data);

-- Logs de auditoria
create table if not exists public.logs (
  id           bigint generated always as identity primary key,
  conta_id     uuid references public.contas(id) on delete cascade,
  usuario_id   uuid references public.usuarios(id) on delete set null,
  acao         text not null,
  entidade     text,
  entidade_id  uuid,
  detalhes     jsonb not null default '{}'::jsonb,
  ip           text,
  criado_em    timestamptz not null default now()
);
create index if not exists logs_conta_idx on public.logs (conta_id, criado_em desc);

-- Administradores do sistema (login próprio em /admin, separado do Google).
-- Crie o hash com: node scripts/hash-senha.js "senha"
create table if not exists public.administradores (
  id            uuid primary key default gen_random_uuid(),
  usuario       text not null unique,
  senha_hash    text not null,
  criado_em     timestamptz not null default now(),
  ultimo_login  timestamptz
);

-- Sessões no banco: o cliente guarda só um identificador aleatório; aqui fica o hash dele.
create table if not exists public.sessoes (
  id           uuid primary key default gen_random_uuid(),
  token_hash   text not null unique,
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

-- Tentativas de login do admin (bloqueio contra força bruta)
create table if not exists public.tentativas_login (
  id         bigint generated always as identity primary key,
  ip         text not null,
  usuario    text,
  sucesso    boolean not null,
  criado_em  timestamptz not null default now()
);
create index if not exists tentativas_login_ip_idx on public.tentativas_login (ip, criado_em desc);

-- RLS ligado e sem políticas: só a service_role (backend) acessa.
alter table public.administradores  enable row level security;
alter table public.sessoes          enable row level security;
alter table public.tentativas_login enable row level security;
alter table public.usuarios       enable row level security;
alter table public.contas         enable row level security;
alter table public.conta_membros  enable row level security;
alter table public.categorias     enable row level security;
alter table public.recorrencias   enable row level security;
alter table public.transacoes     enable row level security;
alter table public.logs           enable row level security;

-- Conhecimento do robô do registro rápido (vocabulário e respostas)
create table if not exists public.robo_palavras (
  id           uuid primary key default gen_random_uuid(),
  significado  text not null check (significado in (
                 'tipo_saida', 'tipo_entrada', 'tipo_investimento',   -- 1ª palavra da mensagem
                 'mensal', 'pendente', 'ontem', 'anteontem', 'hoje',   -- opções no meio da frase
                 'sim', 'nao',                                          -- respostas a perguntas do robô
                 'ajuda', 'saldo')),                                    -- comandos (mensagem inteira)
  palavra      text not null,   -- comparada sem acento e sem maiúsculas; pode ter espaço ("a pagar")
  ativo        boolean not null default true,
  criado_em    timestamptz not null default now(),
  unique (significado, palavra)
);

create table if not exists public.robo_respostas (
  chave          text primary key,
  texto          text not null,
  descricao      text,
  atualizado_em  timestamptz not null default now()
);

alter table public.robo_palavras  enable row level security;
alter table public.robo_respostas enable row level security;

insert into public.robo_palavras (significado, palavra)
select s, unnest(p) from (values
  ('tipo_saida',        array['saida', 'saidas', 's', 'gasto', 'gastei', 'despesa', 'paguei', 'pago', '-']),
  ('tipo_entrada',      array['entrada', 'entradas', 'e', 'receita', 'recebi', 'ganho', 'ganhei', '+']),
  ('tipo_investimento', array['investimento', 'investimentos', 'investi', 'investir', 'invest', 'i', 'aporte', 'aportei', 'apliquei', 'aplicacao']),
  ('mensal',            array['mensal', 'fixa', 'fixo']),
  ('pendente',          array['pendente', 'apagar', 'areceber', 'a pagar', 'a receber']),
  ('ontem',             array['ontem']),
  ('anteontem',         array['anteontem']),
  ('hoje',              array['hoje']),
  ('sim',               array['sim', 's', 'ss', 'pode', 'claro', 'ok', 'confirmo', 'yes']),
  ('nao',               array['nao', 'n', 'cancela', 'cancelar', 'no']),
  ('ajuda',             array['ajuda', 'help', '?', 'oi', 'ola']),
  ('saldo',             array['saldo', 'resumo'])
) as t(s, p)
on conflict (significado, palavra) do nothing;

insert into public.robo_respostas (chave, texto, descricao) values
  ('boas_vindas', E'Olá! Eu sou a WESIA, sua assistente do registro rápido.\nEscreva o lançamento como uma mensagem.\nSempre tipo + descrição + valor.\nEx.: "Saida Futebol 50" ou "Entrada Salário 3500".', 'Primeira mensagem ao abrir o chat'),
  ('sugestoes', E'Saida Futebol 50\nEntrada Salário 3500\nInvestimento Tesouro 500\nSaida Luz 180 mensal pendente\nsaldo', 'Atalhos mostrados abaixo da boas-vindas (um por linha)'),
  ('ajuda', E'Envie sempre tipo + descrição + valor:\n• Saida Futebol 50\n• Entrada Salário 3500\n• Investimento Tesouro 500\n• Saida Luz 180 mensal pendente  (conta mensal a pagar)\n• Saida Mercado 120,50 #Alimentação  (força a categoria)\n• Saida Pizza 60 ontem\nComandos: "saldo" mostra o resumo do mês.', 'Resposta ao comando de ajuda e anexada aos erros'),
  ('faltou', 'Faltou {itens}. Use tipo + descrição + valor, ex.: "Saida Futebol 50"', 'Mensagem incompleta; {itens} = o que faltou'),
  ('faltou_tipo', 'o tipo no início (saida, entrada ou investimento)', 'Item de {itens}'),
  ('faltou_descricao', 'a descrição', 'Item de {itens}'),
  ('faltou_valor', 'o valor', 'Item de {itens}'),
  ('pergunta_categoria', E'A categoria "{categoria}" não existe nas suas categorias.\nDeseja criar a categoria e registrar o lançamento?', 'Pergunta quando a categoria não está cadastrada'),
  ('cancelado', 'Lançamento cancelado.', 'Resposta quando a pessoa diz Não')
on conflict (chave) do nothing;
