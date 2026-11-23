import { db, q } from '../db.js';
import { competencia, indiceDeCompetencia, indiceMes, mesAtual, mesDoIndice, partesLocais, vencimento } from '../datas.js';

// Contas mensais são geradas sob demanda, no máximo até 12 meses à frente.
const MESES_FUTUROS = 12;

// Garante que cada conta mensal ativa tenha seus lançamentos gerados até o mês de `ate`.
// `gerado_ate` só avança, então um lançamento excluído pelo usuário não volta.
export async function gerarLancamentos(contaId, ate) {
  const alvo = Math.min(indiceMes(partesLocais(ate)), indiceMes(mesAtual()) + MESES_FUTUROS);
  const recorrencias = await q(db.from('recorrencias').select('*').eq('conta_id', contaId).eq('ativo', true));

  for (const r of recorrencias) {
    const ultimoGerado = r.gerado_ate ? indiceDeCompetencia(r.gerado_ate) : indiceDeCompetencia(r.inicio) - 1;
    const limite = r.fim ? Math.min(indiceDeCompetencia(r.fim), alvo) : alvo;
    if (ultimoGerado >= limite) continue;

    const novos = [];
    for (let i = ultimoGerado + 1; i <= limite; i++) {
      const mes = mesDoIndice(i);
      novos.push({
        conta_id: contaId,
        tipo: r.tipo,
        descricao: r.descricao,
        valor: r.valor,
        categoria_id: r.categoria_id,
        data: vencimento(mes, r.dia_vencimento),
        status: 'a_pagar',
        recorrencia_id: r.id,
        competencia: competencia(mes),
        origem: 'recorrencia',
        criado_por: r.criado_por,
      });
    }
    await q(db.from('transacoes').upsert(novos, { onConflict: 'recorrencia_id,competencia', ignoreDuplicates: true }));
    await q(db.from('recorrencias').update({ gerado_ate: competencia(mesDoIndice(limite)) }).eq('id', r.id));
  }
}
