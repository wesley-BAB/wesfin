-- WESFIN - migração 004: investimentos como terceiro tipo de lançamento.
-- Rode no SQL Editor do Supabase depois da 003.

alter table public.transacoes drop constraint if exists transacoes_tipo_check;
alter table public.transacoes add constraint transacoes_tipo_check
  check (tipo in ('entrada', 'saida', 'investimento'));

alter table public.recorrencias drop constraint if exists recorrencias_tipo_check;
alter table public.recorrencias add constraint recorrencias_tipo_check
  check (tipo in ('entrada', 'saida', 'investimento'));

alter table public.categorias drop constraint if exists categorias_tipo_check;
alter table public.categorias add constraint categorias_tipo_check
  check (tipo in ('entrada', 'saida', 'ambos', 'investimento'));

-- Categoria padrão de investimentos para quem já tem cadastro
insert into public.categorias (usuario_id, nome, tipo, cor)
select u.id, 'Investimentos', 'investimento', '#2a78d6'
from public.usuarios u
where not exists (
  select 1 from public.categorias c where c.usuario_id = u.id and lower(c.nome) = 'investimentos'
);
