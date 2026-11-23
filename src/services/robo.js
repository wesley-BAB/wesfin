import { db } from '../db.js';
import { normalizar } from './parser.js';
import { TEXTOS_PADRAO, VOCABULARIO_PADRAO } from './robo-padrao.js';

// O que o robô sabe vem das tabelas robo_palavras e robo_respostas.
// Fica em memória por 1 minuto para não consultar o banco a cada mensagem.
const VALIDADE_MS = 60_000;
let cache = null;

// Chamado pelo /admin depois de alterar o treinamento: vale na próxima mensagem.
export const limparCacheRobo = () => { cache = null; };

// Significados aceitos em robo_palavras (mesma lista do check da migração 005).
export const SIGNIFICADOS = {
  tipo_saida: 'Tipo: saída (1ª palavra)',
  tipo_entrada: 'Tipo: entrada (1ª palavra)',
  tipo_investimento: 'Tipo: investimento (1ª palavra)',
  mensal: 'Conta mensal',
  pendente: 'A pagar / a receber',
  ontem: 'Data: ontem',
  anteontem: 'Data: anteontem',
  hoje: 'Data: hoje',
  sim: 'Resposta: sim',
  nao: 'Resposta: não',
  ajuda: 'Comando: ajuda',
  saldo: 'Comando: saldo',
};

export async function carregarRobo() {
  if (cache && Date.now() - cache.em < VALIDADE_MS) return cache.dados;

  const [palavras, respostas] = await Promise.all([
    db.from('robo_palavras').select('significado, palavra').eq('ativo', true),
    db.from('robo_respostas').select('chave, texto'),
  ]);
  if (palavras.error || respostas.error) {
    // Tabelas ainda não criadas (migração 005): segue com o padrão.
    console.warn('[robo] usando conhecimento padrão:', (palavras.error ?? respostas.error).message);
    return { vocab: VOCABULARIO_PADRAO, textos: TEXTOS_PADRAO };
  }

  const vocab = {};
  for (const { significado, palavra } of palavras.data) (vocab[significado] ??= []).push(normalizar(palavra));
  const textos = { ...TEXTOS_PADRAO, ...Object.fromEntries(respostas.data.map((r) => [r.chave, r.texto])) };

  // Vocabulário: só o do banco (desativar uma palavra lá tira ela do robô).
  // Textos: o padrão cobre apenas chaves que não existirem na tabela.
  const dados = { vocab, textos };
  cache = { em: Date.now(), dados };
  return dados;
}

// A mensagem inteira é uma das palavras de `significado`? (sim, nao, ajuda, saldo)
// Aceita ponto no fim, como vem do ditado por voz ("Sim.").
export function significa(vocab, significado, mensagem) {
  const lista = vocab[significado] ?? [];
  const m = normalizar(mensagem);
  return lista.includes(m) || lista.includes(m.replace(/[.!…]+$/u, ''));
}

// Troca {campo} pelos valores.
export const preencher = (texto, dados = {}) => texto.replace(/\{(\w+)\}/g, (_, k) => dados[k] ?? '');
