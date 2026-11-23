import { Router } from 'express';
import { db, HttpError } from '../db.js';
import { registrarLog } from '../services/logs.js';
import { normalizar } from '../services/parser.js';
import { SIGNIFICADOS, limparCacheRobo } from '../services/robo.js';
import { TEXTOS_PADRAO } from '../services/robo-padrao.js';
import * as v from '../validacao.js';

// Treinamento da WESIA pelo /admin: vocabulário (robo_palavras) e textos (robo_respostas).
const router = Router();

// Como q(), mas avisa de forma clara se a migração 005 ainda não foi rodada.
async function consulta(c) {
  const { data, error } = await c;
  if (!error) return data;
  if (error.code === '23505') throw new HttpError(409, 'Essa palavra já existe com esse significado');
  if (error.code === 'PGRST205' || error.code === '42P01') {
    throw new HttpError(503, 'Tabelas da WESIA não encontradas. Rode supabase/migracao_005_robo.sql no Supabase.');
  }
  throw new Error(`Supabase: ${error.message}`);
}

const significado = (valor) => v.umDe(valor, Object.keys(SIGNIFICADOS), 'Significado');
// Guardada já sem acento e em minúsculas, do jeito que a WESIA compara.
const palavra = (valor) => normalizar(v.texto(valor, 'a palavra', { max: 40 })).replace(/\s+/g, ' ');

async function alterou(req, acao, detalhes) {
  limparCacheRobo();
  await registrarLog(req, `admin.robo.${acao}`, { entidade: 'robo', detalhes: { admin: req.admin.usuario, ...detalhes } });
}

router.get('/', async (req, res) => {
  const [palavras, respostas] = await Promise.all([
    consulta(db.from('robo_palavras').select('id, significado, palavra, ativo, criado_em').order('significado').order('palavra')),
    consulta(db.from('robo_respostas').select('chave, texto, descricao, atualizado_em').order('chave')),
  ]);
  res.json({ significados: SIGNIFICADOS, palavras, respostas });
});

router.post('/palavras', async (req, res) => {
  const dados = { significado: significado(req.body?.significado), palavra: palavra(req.body?.palavra) };
  const criada = await consulta(db.from('robo_palavras').insert(dados).select().single());
  await alterou(req, 'adicionar_palavra', dados);
  res.status(201).json(criada);
});

router.patch('/palavras/:id', async (req, res) => {
  const id = v.id(req.params.id);
  const dados = {};
  if (req.body?.significado !== undefined) dados.significado = significado(req.body.significado);
  if (req.body?.palavra !== undefined) dados.palavra = palavra(req.body.palavra);
  if (req.body?.ativo !== undefined) dados.ativo = Boolean(req.body.ativo);
  const atualizada = await consulta(db.from('robo_palavras').update(dados).eq('id', id).select().maybeSingle());
  if (!atualizada) throw new HttpError(404, 'Palavra não encontrada');
  await alterou(req, 'alterar_palavra', { id, ...dados });
  res.json(atualizada);
});

router.delete('/palavras/:id', async (req, res) => {
  const id = v.id(req.params.id);
  const removida = await consulta(db.from('robo_palavras').delete().eq('id', id).select().maybeSingle());
  if (!removida) throw new HttpError(404, 'Palavra não encontrada');
  await alterou(req, 'excluir_palavra', { significado: removida.significado, palavra: removida.palavra });
  res.status(204).end();
});

// Respostas: as chaves são as que a WESIA usa no código; aqui só se altera o texto
// (ou volta ao texto original).
router.patch('/respostas/:chave', async (req, res) => {
  const chave = v.umDe(req.params.chave, Object.keys(TEXTOS_PADRAO), 'Resposta');
  const texto = req.body?.restaurar ? TEXTOS_PADRAO[chave] : v.texto(req.body?.texto, 'o texto', { max: 2000 });
  const salva = await consulta(
    db.from('robo_respostas').upsert({ chave, texto, atualizado_em: new Date().toISOString() }).select().single(),
  );
  await alterou(req, 'alterar_resposta', { chave });
  res.json(salva);
});

export default router;
