import { Router } from 'express';
import { db, q, HttpError } from '../db.js';
import { registrarLog } from '../services/logs.js';
import { gerarLancamentos } from '../services/recorrencias.js';
import { SELECT_TRANSACAO, criarTransacao, garantirCategoria } from '../services/transacoes.js';
import * as v from '../validacao.js';

const router = Router();

export const TIPOS = ['entrada', 'saida', 'investimento'];

export function lerTransacao(corpo = {}) {
  return {
    tipo: v.umDe(corpo.tipo, TIPOS, 'Tipo'),
    valor: v.dinheiro(corpo.valor),
    descricao: v.texto(corpo.descricao, 'a descrição'),
    categoria_id: v.idOpcional(corpo.categoria_id, 'Categoria'),
    data: corpo.data ? v.data(corpo.data) : new Date(),
    status: v.umDe(corpo.status ?? 'pago', ['pago', 'a_pagar'], 'Status'),
    recorrencia: v.umDe(corpo.recorrencia ?? 'unica', ['unica', 'mensal'], 'Repetição'),
  };
}

async function buscar(req, id) {
  const t = await q(db.from('transacoes').select(SELECT_TRANSACAO).eq('id', id).eq('conta_id', req.conta.id).maybeSingle());
  if (!t) throw new HttpError(404, 'Lançamento não encontrado');
  return t;
}

// Lista lançamentos do período [inicio, fim).
router.get('/', async (req, res) => {
  const inicio = v.data(req.query.inicio, 'Data inicial');
  const fim = v.data(req.query.fim, 'Data final');
  if (fim <= inicio) throw new HttpError(400, 'Período inválido');
  await gerarLancamentos(req.conta.id, new Date(fim.getTime() - 1));
  const lista = await q(
    db.from('transacoes')
      .select(SELECT_TRANSACAO)
      .eq('conta_id', req.conta.id)
      .gte('data', inicio.toISOString())
      .lt('data', fim.toISOString())
      .order('data', { ascending: false })
      .limit(2000),
  );
  res.json(lista);
});

// Lançamentos em aberto com vencimento já passado.
router.get('/vencidas', async (req, res) => {
  const agora = new Date();
  await gerarLancamentos(req.conta.id, agora);
  const lista = await q(
    db.from('transacoes')
      .select(SELECT_TRANSACAO)
      .eq('conta_id', req.conta.id)
      .eq('status', 'a_pagar')
      .lt('data', agora.toISOString())
      .order('data')
      .limit(200),
  );
  res.json(lista);
});

router.post('/', async (req, res) => {
  const dados = lerTransacao(req.body);
  await garantirCategoria(req, dados.categoria_id);
  res.status(201).json(await criarTransacao(req, dados));
});

router.patch('/:id', async (req, res) => {
  const id = v.id(req.params.id);
  const antes = await buscar(req, id);
  const corpo = req.body ?? {};
  const dados = { atualizado_em: new Date().toISOString() };
  if (corpo.tipo !== undefined) dados.tipo = v.umDe(corpo.tipo, TIPOS, 'Tipo');
  if (corpo.valor !== undefined) dados.valor = v.dinheiro(corpo.valor);
  if (corpo.descricao !== undefined) dados.descricao = v.texto(corpo.descricao, 'a descrição');
  if (corpo.categoria_id !== undefined) {
    dados.categoria_id = v.idOpcional(corpo.categoria_id, 'Categoria');
    // Manter a categoria de outro membro (lançamento compartilhado) é permitido.
    if (dados.categoria_id !== antes.categoria_id) await garantirCategoria(req, dados.categoria_id);
  }
  if (corpo.data !== undefined) dados.data = v.data(corpo.data).toISOString();
  if (corpo.status !== undefined) {
    dados.status = v.umDe(corpo.status, ['pago', 'a_pagar'], 'Status');
    if (dados.status !== antes.status) dados.pago_em = dados.status === 'pago' ? new Date().toISOString() : null;
  }
  const depois = await q(db.from('transacoes').update(dados).eq('id', id).eq('conta_id', req.conta.id).select(SELECT_TRANSACAO).single());
  const mudancas = Object.fromEntries(
    Object.keys(dados)
      .filter((k) => k !== 'atualizado_em' && k !== 'pago_em' && String(antes[k]) !== String(depois[k]))
      .map((k) => [k, { de: antes[k], para: depois[k] }]),
  );
  await registrarLog(req, 'transacao.editar', { entidade: 'transacao', entidadeId: id, detalhes: { descricao: depois.descricao, mudancas } });
  res.json(depois);
});

// Dar baixa (pago / recebido).
router.post('/:id/pagar', async (req, res) => {
  const id = v.id(req.params.id);
  const t = await buscar(req, id);
  const pagoEm = req.body?.pago_em ? v.data(req.body.pago_em, 'Data de pagamento') : new Date();
  const atualizado = await q(
    db.from('transacoes')
      .update({ status: 'pago', pago_em: pagoEm.toISOString(), atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select(SELECT_TRANSACAO)
      .single(),
  );
  await registrarLog(req, 'transacao.pagar', { entidade: 'transacao', entidadeId: id, detalhes: { descricao: t.descricao, valor: t.valor, tipo: t.tipo } });
  res.json(atualizado);
});

router.post('/:id/reabrir', async (req, res) => {
  const id = v.id(req.params.id);
  const t = await buscar(req, id);
  const atualizado = await q(
    db.from('transacoes')
      .update({ status: 'a_pagar', pago_em: null, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select(SELECT_TRANSACAO)
      .single(),
  );
  await registrarLog(req, 'transacao.reabrir', { entidade: 'transacao', entidadeId: id, detalhes: { descricao: t.descricao, valor: t.valor, tipo: t.tipo } });
  res.json(atualizado);
});

router.delete('/:id', async (req, res) => {
  const id = v.id(req.params.id);
  const t = await buscar(req, id);
  await q(db.from('transacoes').delete().eq('id', id).eq('conta_id', req.conta.id));
  await registrarLog(req, 'transacao.excluir', {
    entidade: 'transacao',
    entidadeId: id,
    detalhes: { descricao: t.descricao, valor: t.valor, tipo: t.tipo, data: t.data },
  });
  res.status(204).end();
});

export default router;
