import { Router } from 'express';
import { db, q, HttpError } from '../db.js';
import { competencia, mesAtual } from '../datas.js';
import { registrarLog } from '../services/logs.js';
import * as v from '../validacao.js';
import { garantirCategoria } from '../services/transacoes.js';

const router = Router();

router.get('/', async (req, res) => {
  const lista = await q(
    db.from('recorrencias')
      .select('*, categoria:categorias(id, nome, cor)')
      .eq('conta_id', req.conta.id)
      .order('ativo', { ascending: false })
      .order('dia_vencimento'),
  );
  res.json(lista);
});

// Edita a conta mensal e aplica a mudança nos lançamentos em aberto a partir do mês atual.
router.patch('/:id', async (req, res) => {
  const id = v.id(req.params.id);
  const corpo = req.body ?? {};
  const dados = {};
  if (corpo.descricao !== undefined) dados.descricao = v.texto(corpo.descricao, 'a descrição');
  if (corpo.valor !== undefined) dados.valor = v.dinheiro(corpo.valor);
  if (corpo.categoria_id !== undefined) {
    dados.categoria_id = v.idOpcional(corpo.categoria_id, 'Categoria');
    const atual = await q(db.from('recorrencias').select('categoria_id').eq('id', id).eq('conta_id', req.conta.id).maybeSingle());
    if (dados.categoria_id !== atual?.categoria_id) await garantirCategoria(req, dados.categoria_id);
  }
  if (corpo.dia_vencimento !== undefined) dados.dia_vencimento = v.diaDoMes(corpo.dia_vencimento);

  const rec = await q(db.from('recorrencias').update(dados).eq('id', id).eq('conta_id', req.conta.id).select().maybeSingle());
  if (!rec) throw new HttpError(404, 'Conta mensal não encontrada');

  const { dia_vencimento, ...camposLancamento } = dados;
  if (Object.keys(camposLancamento).length) {
    await q(
      db.from('transacoes')
        .update({ ...camposLancamento, atualizado_em: new Date().toISOString() })
        .eq('recorrencia_id', id)
        .eq('status', 'a_pagar')
        .gte('competencia', competencia(mesAtual())),
    );
  }
  await registrarLog(req, 'recorrencia.editar', { entidade: 'recorrencia', entidadeId: id, detalhes: { descricao: rec.descricao, ...dados } });
  res.json(rec);
});

// Encerra a conta mensal: mantém o histórico e remove meses futuros ainda em aberto.
router.delete('/:id', async (req, res) => {
  const id = v.id(req.params.id);
  const atual = competencia(mesAtual());
  const rec = await q(
    db.from('recorrencias').update({ ativo: false, fim: atual }).eq('id', id).eq('conta_id', req.conta.id).select().maybeSingle(),
  );
  if (!rec) throw new HttpError(404, 'Conta mensal não encontrada');
  await q(db.from('transacoes').delete().eq('recorrencia_id', id).eq('status', 'a_pagar').gt('competencia', atual));
  await registrarLog(req, 'recorrencia.encerrar', { entidade: 'recorrencia', entidadeId: id, detalhes: { descricao: rec.descricao, valor: rec.valor } });
  res.status(204).end();
});

export default router;
