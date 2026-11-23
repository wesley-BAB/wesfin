// Interpreta mensagens rápidas do chat, por exemplo:
//   "Saida Futebol 50"          -> saída de 50, descrição "Futebol"
//   "Entrada Salário 3.500,00"  -> entrada de 3500
//   "Saida Luz 180 mensal pendente" -> conta mensal de 180, a pagar
//   "gastei 32,90 ifood ontem"  -> saída de 32,90 com data de ontem
//   "Saida Mercado 120 #Alimentação" -> força a categoria
//   "Investimento Tesouro 500"  -> investimento de 500
// O vocabulário (que palavra significa o quê) e os textos vêm do banco; ver services/robo.js.

import { TEXTOS_PADRAO, VOCABULARIO_PADRAO } from './robo-padrao.js';

export const normalizar = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function lerValor(token) {
  let s = token.replace(/^r\$/i, '').replace(/^\$/, '');
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); // 1.234,56
  else if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.'); // 32,90
  else if (!/^\d+(\.\d{1,2})?$/.test(s)) return null; // 50 ou 50.5
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Ajustes para texto vindo de fala (ditado): pontuação no fim das palavras, "R$ 50",
// "50 reais", "2 mil". Também vale para o que é digitado.
const MOEDA = new Set(['r$', '$', 'rs']);
const UNIDADE = new Set(['reais', 'real', 'conto', 'contos', 'pila', 'pilas']);
function limparFala(tokens) {
  const limpos = tokens.map((t) => t.replace(/[.,!?;:…]+$/u, '')).filter(Boolean);
  const saida = [];
  for (const t of limpos) {
    const n = normalizar(t);
    const anterior = saida.length ? lerValor(saida.at(-1)) : null;
    if (MOEDA.has(n)) continue;
    if (anterior !== null && UNIDADE.has(n)) continue;
    if (anterior !== null && n === 'mil') { saida[saida.length - 1] = String(anterior * 1000); continue; }
    saida.push(t);
  }
  return saida;
}

// Palavras de ligação nas pontas da descrição ("gastei 50 no Monster" -> "Monster").
const LIGACAO = new Set(['de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'em', 'com', 'pro', 'pra', 'para', 'o', 'a', 'os', 'as', 'um', 'uma']);
function aparar(palavras) {
  while (palavras.length > 1 && LIGACAO.has(normalizar(palavras[0]))) palavras.shift();
  while (palavras.length > 1 && LIGACAO.has(normalizar(palavras.at(-1)))) palavras.pop();
  return palavras.length === 1 && LIGACAO.has(normalizar(palavras[0])) ? [] : palavras;
}

function acharCategoria(palavras, descricao, tipo, categorias, tag) {
  const compativeis = categorias.filter((c) => c.tipo === tipo || c.tipo === 'ambos');
  if (tag) {
    const alvo = normalizar(tag);
    return categorias.find((c) => normalizar(c.nome) === alvo) ?? null;
  }
  const descNorm = ` ${normalizar(descricao)} `;
  const normPalavras = new Set(palavras.map(normalizar));
  return (
    compativeis.find((c) => normPalavras.has(normalizar(c.nome))) ??
    compativeis.find((c) => descNorm.includes(` ${normalizar(c.nome)} `)) ??
    // Investimento sem categoria na frase cai na primeira categoria de investimento
    (tipo === 'investimento' ? categorias.find((c) => c.tipo === 'investimento') : null) ??
    null
  );
}

// Quantos tokens a partir de `i` formam uma das expressões da lista (a mais longa); 0 se nenhuma.
function casar(normais, i, expressoes = []) {
  let melhor = 0;
  for (const e of expressoes) {
    const partes = e.split(' ');
    if (partes.length > melhor && partes.every((p, k) => normais[i + k] === p)) melhor = partes.length;
  }
  return melhor;
}

export function interpretarMensagem(texto, categorias = [], vocab = VOCABULARIO_PADRAO, textos = TEXTOS_PADRAO) {
  let tokens = limparFala(String(texto || '').trim().split(/\s+/).filter(Boolean));
  if (!tokens.length) return { erro: 'Mensagem vazia' };

  let tipo = null;
  const inicio = tokens.map(normalizar);
  for (const t of ['saida', 'entrada', 'investimento']) {
    const n = casar(inicio, 0, vocab[`tipo_${t}`]);
    if (n) { tipo = t; tokens = tokens.slice(n); break; }
  }

  let valor = null;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const v = lerValor(tokens[i]);
    if (v !== null) {
      valor = v;
      tokens.splice(i, 1);
      break;
    }
  }

  let mensal = false;
  let pendente = false;
  let diasAtras = 0;
  let tag = null;
  let palavras = [];
  const normais = tokens.map(normalizar);
  const OPCOES = {
    mensal: () => { mensal = true; },
    pendente: () => { pendente = true; },
    ontem: () => { diasAtras = 1; },
    anteontem: () => { diasAtras = 2; },
    hoje: () => { diasAtras = 0; },
  };
  for (let i = 0; i < tokens.length; i++) {
    const opcao = Object.keys(OPCOES).map((k) => [k, casar(normais, i, vocab[k])]).find(([, n]) => n);
    if (opcao) { OPCOES[opcao[0]](); i += opcao[1] - 1; }
    else if (tokens[i].startsWith('#') && tokens[i].length > 1) tag = tokens[i].slice(1).replace(/_/g, ' ');
    else palavras.push(tokens[i]);
  }
  palavras = aparar(palavras);

  // Os três são obrigatórios: tipo + descrição + valor ("Saida Futebol 50").
  const faltando = [];
  if (!tipo) faltando.push(textos.faltou_tipo);
  if (!palavras.length) faltando.push(textos.faltou_descricao);
  if (!valor || valor <= 0) faltando.push(textos.faltou_valor);
  if (faltando.length) {
    const itens = faltando.length > 1 ? `${faltando.slice(0, -1).join(', ')} e ${faltando.at(-1)}` : faltando[0];
    return { erro: textos.faltou.replace('{itens}', itens) };
  }

  let descricao = palavras.join(' ').slice(0, 120);
  const categoria = acharCategoria(palavras, descricao, tipo, categorias, tag);
  descricao = descricao.charAt(0).toUpperCase() + descricao.slice(1);

  // Sem categoria cadastrada que bata: sugere a #tag ou a primeira palavra da descrição
  let categoriaSugerida = null;
  if (!categoria) {
    const nome = (tag ?? palavras[0]).replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 40) || 'Outros';
    categoriaSugerida = nome.charAt(0).toUpperCase() + nome.slice(1);
  }

  return {
    tipo,
    valor: Math.round(valor * 100) / 100,
    descricao,
    categoria_id: categoria?.id ?? null,
    categoriaSugerida,
    recorrencia: mensal ? 'mensal' : 'unica',
    status: pendente ? 'a_pagar' : 'pago',
    diasAtras,
  };
}
