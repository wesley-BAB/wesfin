import { db } from '../db.js';

// Registra uma ação de auditoria. Falha no log nunca derruba a requisição.
export async function registrarLog(req, acao, { entidade = null, entidadeId = null, detalhes = {}, contaId } = {}) {
  const { error } = await db.from('logs').insert({
    conta_id: contaId ?? req.conta?.id ?? null,
    usuario_id: req.usuario?.id ?? null,
    acao,
    entidade,
    entidade_id: entidadeId,
    detalhes,
    ip: req.ip,
  });
  if (error) console.error('Falha ao registrar log:', error.message);
}
