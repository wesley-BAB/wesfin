-- =====================================================================
-- WESFIN - migração 005: o que o robô do registro rápido sabe fica no banco.
--   robo_palavras  -> vocabulário (que palavra significa o quê)
--   robo_respostas -> textos que o robô responde ({campo} é substituído)
-- Para ensinar algo novo, inclua linhas aqui pelo Table Editor do Supabase;
-- a API recarrega em até 1 minuto.
-- Execute no Supabase: SQL Editor > New query > cole tudo > Run
-- =====================================================================

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
