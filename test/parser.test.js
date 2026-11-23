import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpretarMensagem, lerValor } from '../src/services/parser.js';

const categorias = [
  { id: 'c1', nome: 'Lazer', tipo: 'saida' },
  { id: 'c2', nome: 'Salário', tipo: 'entrada' },
  { id: 'c3', nome: 'Alimentação', tipo: 'saida' },
  { id: 'c4', nome: 'Investimentos', tipo: 'investimento' },
];

test('investimento cai na categoria de investimento', () => {
  const r = interpretarMensagem('Investimento Tesouro 500', categorias);
  assert.equal(r.tipo, 'investimento');
  assert.equal(r.valor, 500);
  assert.equal(r.descricao, 'Tesouro');
  assert.equal(r.categoria_id, 'c4');
  assert.equal(interpretarMensagem('aporte CDB 1.000', categorias).categoria_id, 'c4');
});

test('Saida Futebol 50', () => {
  const r = interpretarMensagem('Saida Futebol 50', categorias);
  assert.equal(r.tipo, 'saida');
  assert.equal(r.valor, 50);
  assert.equal(r.descricao, 'Futebol');
  assert.equal(r.status, 'pago');
  assert.equal(r.recorrencia, 'unica');
});

test('entrada com acento e valor brasileiro', () => {
  const r = interpretarMensagem('Entrada Salario 3.500,00', categorias);
  assert.equal(r.tipo, 'entrada');
  assert.equal(r.valor, 3500);
  assert.equal(r.categoria_id, 'c2');
});

test('exige tipo, descrição e valor', () => {
  assert.ok(interpretarMensagem('saida 10', categorias).erro);
  assert.ok(interpretarMensagem('saida EUA', categorias).erro);
  assert.ok(interpretarMensagem('Futebol 50', categorias).erro);
  assert.ok(interpretarMensagem('saida mensal 50', categorias).erro);
  assert.match(interpretarMensagem('saida 10', categorias).erro, /descrição/);
  assert.equal(interpretarMensagem('saida EUA 10', categorias).descricao, 'EUA');
  assert.equal(interpretarMensagem('saida viagem EUA 10', categorias).descricao, 'Viagem EUA');
});

test('sugere categoria quando nenhuma cadastrada bate', () => {
  assert.equal(interpretarMensagem('saida viagem EUA 10', categorias).categoriaSugerida, 'Viagem');
  assert.equal(interpretarMensagem('saida racao 80 #pets', categorias).categoriaSugerida, 'Pets');
  const r = interpretarMensagem('saida lazer cinema 40', categorias);
  assert.equal(r.categoria_id, 'c1');
  assert.equal(r.categoriaSugerida, null);
});

test('vocabulário vem de fora (tabela robo_palavras)', () => {
  const vocab = { tipo_saida: ['torrei'], tipo_entrada: [], tipo_investimento: [], mensal: ['todo mes'], pendente: [] };
  const r = interpretarMensagem('Torrei Lazer show 200 todo mês', categorias, vocab);
  assert.equal(r.tipo, 'saida');
  assert.equal(r.recorrencia, 'mensal');
  assert.equal(r.categoria_id, 'c1');
  assert.ok(interpretarMensagem('Saida Lazer 10', categorias, vocab).erro); // "saida" não está nesse vocabulário
});

test('mensal e pendente', () => {
  const r = interpretarMensagem('Saida Luz 180 mensal a pagar', categorias);
  assert.equal(r.tipo, 'saida');
  assert.equal(r.descricao, 'Luz');
  assert.equal(r.recorrencia, 'mensal');
  assert.equal(r.status, 'a_pagar');
});

test('categoria por palavra e por tag', () => {
  assert.equal(interpretarMensagem('saída lazer cinema 40', categorias).categoria_id, 'c1');
  assert.equal(interpretarMensagem('saida Mercado 120,50 #Alimentacao', categorias).categoria_id, 'c3');
});

test('ontem e valor no meio', () => {
  const r = interpretarMensagem('gastei 32,90 ifood ontem', categorias);
  assert.equal(r.valor, 32.9);
  assert.equal(r.descricao, 'Ifood');
  assert.equal(r.diasAtras, 1);
});

test('sem valor retorna erro', () => {
  assert.ok(interpretarMensagem('Saida Futebol', categorias).erro);
});

test('texto vindo de fala (ditado)', () => {
  const r = interpretarMensagem('Gasto Monster 50.', categorias);
  assert.equal(r.tipo, 'saida');
  assert.equal(r.descricao, 'Monster');
  assert.equal(r.valor, 50);
  assert.equal(interpretarMensagem('gasto Monster R$ 50', categorias).descricao, 'Monster');
  assert.equal(interpretarMensagem('gasto monster 50 reais', categorias).descricao, 'Monster');
  assert.equal(interpretarMensagem('entrada bônus 2 mil', categorias).valor, 2000);
  const r2 = interpretarMensagem('gastei 50 reais no Monster', categorias);
  assert.equal(r2.descricao, 'Monster');
  assert.equal(r2.categoriaSugerida, 'Monster');
  assert.equal(interpretarMensagem('saida conta de luz 180', categorias).descricao, 'Conta de luz');
  assert.ok(interpretarMensagem('saida de 10', categorias).erro);
});

test('lerValor', () => {
  assert.equal(lerValor('R$50'), 50);
  assert.equal(lerValor('1.500'), 1500);
  assert.equal(lerValor('50.5'), 50.5);
  assert.equal(lerValor('abc'), null);
});
