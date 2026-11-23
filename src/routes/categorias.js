import { Router } from 'express';
import { db, q, HttpError } from '../db.js';
import { registrarLog } from '../services/logs.js';
import * as v from '../validacao.js';

// Categorias são de cada usuário: cada pessoa monta as suas, mesmo em contas compartilhadas.
const router = Router();
const TIPOS = ['entrada', 'saida', 'ambos', 'investimento'];

router.get('/', async (req, res) => {
  res.json(await q(db.from('categorias').select('*').eq('usuario_id', req.usuario.id).order('nome')));
});

router.post('/', async (req, res) => {
  const dados = {
    usuario_id: req.usuario.id,
    nome: v.texto(req.body?.nome, 'o nome da categoria', { max: 40 }),
    tipo: v.umDe(req.body?.tipo ?? 'saida', TIPOS, 'Tipo'),
    cor: v.cor(req.body?.cor) ?? '#2a78d6',
  };
  const categoria = await q(db.from('categorias').insert(dados).select().single());
  await registrarLog(req, 'categoria.criar', { entidade: 'categoria', entidadeId: categoria.id, detalhes: { nome: dados.nome } });
  res.status(201).json(categoria);
});

router.patch('/:id', async (req, res) => {
  const id = v.id(req.params.id);
  const dados = {};
  if (req.body?.nome !== undefined) dados.nome = v.texto(req.body.nome, 'o nome da categoria', { max: 40 });
  if (req.body?.tipo !== undefined) dados.tipo = v.umDe(req.body.tipo, TIPOS, 'Tipo');
  if (req.body?.cor !== undefined) dados.cor = v.cor(req.body.cor);
  const categoria = await q(db.from('categorias').update(dados).eq('id', id).eq('usuario_id', req.usuario.id).select().maybeSingle());
  if (!categoria) throw new HttpError(404, 'Categoria não encontrada');
  await registrarLog(req, 'categoria.editar', { entidade: 'categoria', entidadeId: id, detalhes: dados });
  res.json(categoria);
});

router.delete('/:id', async (req, res) => {
  const id = v.id(req.params.id);
  const removida = await q(db.from('categorias').delete().eq('id', id).eq('usuario_id', req.usuario.id).select().maybeSingle());
  if (!removida) throw new HttpError(404, 'Categoria não encontrada');
  await registrarLog(req, 'categoria.excluir', { entidade: 'categoria', entidadeId: id, detalhes: { nome: removida.nome } });
  res.status(204).end();
});

export default router;
