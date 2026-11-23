import { Router } from 'express';
import { db, q } from '../db.js';
import { intervaloMesAtual } from '../datas.js';
import { interpretarMensagem, normalizar } from '../services/parser.js';
import { criarTransacao } from '../services/transacoes.js';
import { registrarLog } from '../services/logs.js';
import { carregarRobo, preencher, significa } from '../services/robo.js';
import { gerarLancamentos } from '../services/recorrencias.js';
import * as v from '../validacao.js';

const router = Router();

const brl = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });


async function resumoDoMes(contaId) {
  const { inicio, fim } = intervaloMesAtual();
  await gerarLancamentos(contaId, new Date(new Date(fim).getTime() - 1));
  const lista = await q(
    db.from('transacoes').select('tipo, valor, status').eq('conta_id', contaId).gte('data', inicio).lt('data', fim),
  );
  const soma = (filtro) => lista.filter(filtro).reduce((t, x) => t + Number(x.valor), 0);
  const entradas = soma((x) => x.tipo === 'entrada' && x.status === 'pago');
  const saidas = soma((x) => x.tipo === 'saida' && x.status === 'pago');
  const investimentos = soma((x) => x.tipo === 'investimento' && x.status === 'pago');
  const aPagar = soma((x) => x.tipo === 'saida' && x.status === 'a_pagar');
  return [
    'Resumo do mês',
    `Entradas: ${brl(entradas)}`,
    `Saídas: ${brl(saidas)}`,
    `Investimentos: ${brl(investimentos)}`,
    `Saldo livre: ${brl(entradas - saidas - investimentos)}`,
    `A pagar: ${brl(aPagar)}`,
  ].join('\n');
}

// Se o parser não achou categoria, reaproveita a de um lançamento anterior do
// mesmo usuário com a mesma descrição.
async function categoriaPorHistorico(req, descricao, tipo) {
  const anterior = await q(
    db.from('transacoes')
      .select('categoria_id')
      .eq('conta_id', req.conta.id)
      .eq('criado_por', req.usuario.id)
      .eq('tipo', tipo)
      .ilike('descricao', descricao.replace(/[%_]/g, ''))
      .not('categoria_id', 'is', null)
      .order('criado_em', { ascending: false })
      .limit(1),
  );
  return anterior[0]?.categoria_id ?? null;
}

// Cria a categoria confirmada no chat (ou reaproveita uma de mesmo nome, ignorando acentos).
const CORES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
async function categoriaDoChat(req, nome, tipo, categorias) {
  const existente = categorias.find((c) => normalizar(c.nome) === normalizar(nome));
  if (existente) return { id: existente.id, criada: false };
  const cor = CORES[categorias.length % CORES.length];
  const categoria = await q(db.from('categorias').insert({ usuario_id: req.usuario.id, nome, tipo, cor }).select('id').single());
  await registrarLog(req, 'categoria.criar', { entidade: 'categoria', entidadeId: categoria.id, detalhes: { nome, origem: 'chat' } });
  return { id: categoria.id, criada: true };
}

// Primeira mensagem e atalhos do chat (também vêm do banco).
router.get('/inicio', async (req, res) => {
  const { textos } = await carregarRobo();
  res.json({ boas_vindas: textos.boas_vindas, sugestoes: textos.sugestoes.split('\n').map((s) => s.trim()).filter(Boolean) });
});

router.post('/', async (req, res) => {
  const robo = await carregarRobo();
  const { vocab, textos } = robo;
  const mensagem = v.texto(req.body?.mensagem, 'a mensagem', { max: 200 });

  // Resposta a uma pergunta do robô ("criar a categoria?"): pelo botão (`resposta`)
  // ou digitada (sim/não do vocabulário). Qualquer outra coisa encerra a pergunta
  // e é tratada como mensagem nova; sem `confirmacao` na volta, o app desativa os botões.
  if (req.body?.confirmando) {
    const original = v.texto(req.body.confirmando, 'a mensagem original', { max: 200 });
    const resposta = typeof req.body.resposta === 'boolean'
      ? req.body.resposta
      : significa(vocab, 'sim', mensagem) ? true : significa(vocab, 'nao', mensagem) ? false : null;
    if (resposta === false) return res.json({ resposta: textos.cancelado, confirmacao: 'nao' });
    if (resposta === true) return registrar(req, res, robo, original, { criarCategoria: true, confirmacao: 'sim' });
  }

  if (significa(vocab, 'ajuda', mensagem)) return res.json({ resposta: textos.ajuda });
  if (significa(vocab, 'saldo', mensagem)) return res.json({ resposta: await resumoDoMes(req.conta.id) });
  return registrar(req, res, robo, mensagem, {});
});

async function registrar(req, res, { vocab, textos }, mensagem, { criarCategoria = false, confirmacao } = {}) {
  const categorias = await q(db.from('categorias').select('id, nome, tipo').eq('usuario_id', req.usuario.id));
  const lido = interpretarMensagem(mensagem, categorias, vocab, textos);
  if (lido.erro) return res.json({ resposta: `${lido.erro}\n\n${textos.ajuda}`, erro: true, confirmacao });

  lido.categoria_id ??= await categoriaPorHistorico(req, lido.descricao, lido.tipo);

  // A categoria precisa existir: sem ela, pergunta antes de gravar.
  let categoriaCriada = false;
  if (!lido.categoria_id) {
    if (!criarCategoria) {
      return res.json({
        resposta: preencher(textos.pergunta_categoria, { categoria: lido.categoriaSugerida }),
        pergunta: { categoria: lido.categoriaSugerida },
      });
    }
    ({ id: lido.categoria_id, criada: categoriaCriada } = await categoriaDoChat(req, lido.categoriaSugerida, lido.tipo, categorias));
  }

  const data = new Date(Date.now() - lido.diasAtras * 86_400_000);
  const transacao = await criarTransacao(req, { ...lido, data }, 'chat');

  const rotuloTipo = { entrada: 'Entrada', saida: 'Saída', investimento: 'Investimento' }[transacao.tipo];
  const registrado = transacao.tipo === 'investimento' ? 'registrado' : 'registrada';
  const partes = [`${rotuloTipo} de ${brl(transacao.valor)} ${registrado}`, transacao.descricao];
  if (transacao.categoria) partes.push(`Categoria: ${transacao.categoria.nome}${categoriaCriada ? ' (criada agora)' : ''}`);
  if (lido.recorrencia === 'mensal') partes.push('Repete todo mês');
  if (transacao.status === 'a_pagar') partes.push(transacao.tipo === 'entrada' ? 'Status: a receber' : 'Status: a pagar');

  res.status(201).json({ resposta: partes.join('\n'), transacao, confirmacao, categoriaCriada });
}

export default router;