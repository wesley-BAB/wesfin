import { db, q, HttpError } from '../db.js';
import { competencia, partesLocais } from '../datas.js';
import { gerarLancamentos } from './recorrencias.js';
import { registrarLog } from './logs.js';

export const SELECT_TRANSACAO = '*, categoria:categorias(id, nome, cor), autor:usuarios(nome, email)';

// Só é possível escolher uma categoria própria (categorias são por usuário).
export async function garantirCategoria(req, categoriaId) {
  if (!categoriaId) return;
  const existe = await q(db.from('categorias').select('id').eq('id', categoriaId).eq('usuario_id', req.usuario.id).maybeSingle());
  if (!existe) throw new HttpError(400, 'Categoria não encontrada');
}

// Cria um lançamento. Se `recorrencia === 'mensal'`, cria a conta mensal e
// devolve o lançamento do primeiro mês.
export async function criarTransacao(req, dados, origem = 'manual') {
  const contaId = req.conta.id;
  const base = {
    conta_id: contaId,
    tipo: dados.tipo,
    descricao: dados.descricao,
    valor: dados.valor,
    categoria_id: dados.categoria_id,
    criado_por: req.usuario.id,
  };
  const pagoEm = dados.status === 'pago' ? new Date().toISOString() : null;
  let transacao;

  if (dados.recorrencia === 'mensal') {
    const partes = partesLocais(dados.data);
    const recorrencia = await q(
      db.from('recorrencias')
        .insert({ ...base, dia_vencimento: partes.dia, inicio: competencia(partes) })
        .select()
        .single(),
    );
    await gerarLancamentos(contaId, dados.data);
    transacao = await q(
      db.from('transacoes')
        .update({ status: dados.status, pago_em: pagoEm, origem })
        .eq('recorrencia_id', recorrencia.id)
        .eq('competencia', recorrencia.inicio)
        .select(SELECT_TRANSACAO)
        .maybeSingle(),
    );
    if (!transacao) throw new HttpError(400, 'Conta mensal criada, mas a data inicial está mais de 12 meses à frente');
    await registrarLog(req, 'recorrencia.criar', {
      entidade: 'recorrencia',
      entidadeId: recorrencia.id,
      detalhes: { descricao: base.descricao, valor: base.valor, tipo: base.tipo, dia: partes.dia },
    });
  } else {
    transacao = await q(
      db.from('transacoes')
        .insert({ ...base, data: dados.data.toISOString(), status: dados.status, pago_em: pagoEm, origem })
        .select(SELECT_TRANSACAO)
        .single(),
    );
  }

  await registrarLog(req, 'transacao.criar', {
    entidade: 'transacao',
    entidadeId: transacao.id,
    detalhes: { descricao: transacao.descricao, valor: transacao.valor, tipo: transacao.tipo, status: transacao.status, origem },
  });
  return transacao;
}
