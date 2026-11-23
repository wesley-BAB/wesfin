// Geometria da marca WESFIN: faixa em "W" que vira seta para cima + barras de gráfico.
// Usada pelo componente Marca (app) e por scripts/gerar-icones.mjs (ícones e favicon),
// para que a logo seja igual em todo lugar.

const LARGURA_FAIXA = 22; // medida na horizontal
const TOPO = 22;
const PICO = 32;
const BASE = 92;
const ENTRADA = 18; // centro do topo do primeiro traço
const PASSO = 22.5; // deslocamento horizontal de cada traço

const meia = LARGURA_FAIXA / 2;
const trapezio = (xTopo, yTopo, xBase, yBase) => [
  [xTopo - meia, yTopo], [xTopo + meia, yTopo], [xBase + meia, yBase], [xBase - meia, yBase],
];

const x1 = ENTRADA + 24; // fundo do primeiro V
const x2 = x1 + PASSO; // pico central
const x3 = x2 + PASSO; // fundo do segundo V
const yFimHaste = 42;
const xFimHaste = x3 + (BASE - yFimHaste) * (PASSO / (BASE - PICO));

// Direção da haste da seta (mesma inclinação dos traços que sobem)
const dx = PASSO / (BASE - PICO);
const comp = Math.hypot(dx, 1);
const dir = [dx / comp, -1 / comp];
const perp = [1 / comp, dx / comp];
const ABA = 20;
const PONTA = 30;
const meiaHaste = meia / comp; // meia espessura medida na perpendicular

// Segmentos alternados: claro descendo, verde subindo (o verde escurece perto da dobra).
// A haste termina num corte perpendicular, encaixado na base da ponta da seta.
export const FAIXA = [
  { cor: 'claro', pontos: trapezio(ENTRADA, TOPO, x1, BASE) },
  { cor: 'verde', pontos: trapezio(x2, PICO, x1, BASE) },
  { cor: 'claro', pontos: trapezio(x2, PICO, x3, BASE) },
  {
    cor: 'verde',
    pontos: [
      [xFimHaste - meiaHaste * perp[0], yFimHaste - meiaHaste * perp[1]],
      [xFimHaste + meiaHaste * perp[0], yFimHaste + meiaHaste * perp[1]],
      [x3 + meia, BASE],
      [x3 - meia, BASE],
    ],
  },
];

// Ponta da seta, perpendicular à haste
export const SETA = [
  [xFimHaste - ABA * perp[0], yFimHaste - ABA * perp[1]],
  [xFimHaste + PONTA * dir[0], yFimHaste + PONTA * dir[1]],
  [xFimHaste + ABA * perp[0], yFimHaste + ABA * perp[1]],
];

// Barras crescentes no vão debaixo do pico central
export const BARRAS = [
  { x: x1 + meia + 3, altura: 6 },
  { x: x1 + meia + 8, altura: 10.5 },
  { x: x1 + meia + 13, altura: 15 },
].map((b) => ({ ...b, largura: 3.6, y: BASE + 1 - b.altura })); // +1: alinha com o canto arredondado da faixa

const xs = [...FAIXA.flatMap((s) => s.pontos), ...SETA].map((p) => p[0]);
const ys = [...FAIXA.flatMap((s) => s.pontos), ...SETA].map((p) => p[1]);
const MARGEM = 5; // folga para o arredondamento dos cantos
export const CAIXA = {
  x: Math.min(...xs) - MARGEM,
  y: Math.min(...ys) - MARGEM,
  largura: Math.max(...xs) - Math.min(...xs) + MARGEM * 2,
  altura: Math.max(...ys) - Math.min(...ys) + MARGEM * 2,
};

// Cantos arredondados: contorno da mesma cor com junção redonda.
export const ARREDONDAR = 3.2;

export const GRADIENTES = {
  verde: ['#0d7334', '#1fae4c', '#4fe27c'], // da dobra (baixo) para a ponta (cima)
  claro: ['#ffffff', '#d5dcd8'], // faixa clara, para fundo escuro
  grafite: ['#34403a', '#151b18'], // faixa clara vira grafite em fundo claro
};

const r = (n) => Math.round(n * 100) / 100;
export const caminho = (pontos) => `M${pontos.map(([x, y]) => `${r(x)} ${r(y)}`).join(' L')} Z`;
