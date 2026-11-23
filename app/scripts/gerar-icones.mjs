// Gera os SVGs da marca e os PNGs de ícone (app, Android, favicon, splash)
// a partir de src/lib/marca.js.
// Uso: node scripts/gerar-icones.mjs <caminho do pacote sharp>
//   (sharp não é dependência do app; instale-o numa pasta temporária)
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARREDONDAR, BARRAS, CAIXA, FAIXA, GRADIENTES, SETA, caminho } from '../src/lib/marca.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const FUNDO = ['#13281b', '#08110c']; // verde quase preto, do topo para baixo

function defs(faixaClara) {
  const [v0, v1, v2] = GRADIENTES.verde;
  const [c0, c1] = GRADIENTES[faixaClara];
  return `
    <linearGradient id="verde" gradientUnits="userSpaceOnUse" x1="${CAIXA.x}" y1="${CAIXA.y + CAIXA.altura}" x2="${CAIXA.x + CAIXA.largura * 0.4}" y2="${CAIXA.y}">
      <stop offset="0" stop-color="${v0}"/><stop offset="0.45" stop-color="${v1}"/><stop offset="1" stop-color="${v2}"/>
    </linearGradient>
    <linearGradient id="claro" gradientUnits="userSpaceOnUse" x1="0" y1="${CAIXA.y}" x2="0" y2="${CAIXA.y + CAIXA.altura}">
      <stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/>
    </linearGradient>
    <linearGradient id="barra" gradientUnits="userSpaceOnUse" x1="0" y1="${CAIXA.y + CAIXA.altura}" x2="0" y2="${CAIXA.y + CAIXA.altura * 0.55}">
      <stop offset="0" stop-color="${v1}"/><stop offset="1" stop-color="${v2}"/>
    </linearGradient>
    <linearGradient id="fundo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${FUNDO[0]}"/><stop offset="1" stop-color="${FUNDO[1]}"/>
    </linearGradient>`;
}

// Só os traços da marca, num grupo posicionado em (x, y) com largura `largura`.
function desenho({ x, y, largura, mono = false }) {
  const escala = largura / CAIXA.largura;
  const cor = (tipo) => (mono ? '#ffffff' : tipo === 'verde' ? 'url(#verde)' : 'url(#claro)');
  const borda = `stroke-width="${ARREDONDAR}" stroke-linejoin="round"`;
  const formas = [
    ...FAIXA.map((s) => `<path d="${caminho(s.pontos)}" fill="${cor(s.cor)}" stroke="${cor(s.cor)}" ${borda}/>`),
    `<path d="${caminho(SETA)}" fill="${cor('verde')}" stroke="${cor('verde')}" ${borda}/>`,
    ...BARRAS.map((b) => `<rect x="${b.x}" y="${b.y}" width="${b.largura}" height="${b.altura}" rx="1" fill="${mono ? '#ffffff' : 'url(#barra)'}"/>`),
  ];
  return `<g transform="translate(${x} ${y}) scale(${escala}) translate(${-CAIXA.x} ${-CAIXA.y})">${formas.join('')}</g>`;
}

function svg({ tamanho, proporcao, fundo = null, faixa = 'claro', mono = false, cantos = 0 }) {
  const largura = tamanho * proporcao;
  const altura = largura * (CAIXA.altura / CAIXA.largura);
  const corpoFundo = fundo ? `<rect width="${tamanho}" height="${tamanho}" rx="${cantos}" fill="${fundo}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="0 0 ${tamanho} ${tamanho}">
  <defs>${defs(faixa)}</defs>${corpoFundo}
  ${desenho({ x: (tamanho - largura) / 2, y: (tamanho - altura) / 2 + altura * 0.02, largura, mono })}
</svg>`;
}

// Marca solta (sem fundo), no tamanho natural da caixa
const marcaSolta = (faixa) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CAIXA.largura} ${CAIXA.altura}">
  <defs>${defs(faixa)}</defs>
  ${desenho({ x: 0, y: 0, largura: CAIXA.largura })}
</svg>`;

const pastaMarca = join(raiz, 'assets', 'marca');
mkdirSync(pastaMarca, { recursive: true });
writeFileSync(join(pastaMarca, 'marca-fundo-escuro.svg'), marcaSolta('claro'));
writeFileSync(join(pastaMarca, 'marca-fundo-claro.svg'), marcaSolta('grafite'));

const PNGS = {
  'icon.png': svg({ tamanho: 1024, proporcao: 0.74, fundo: 'url(#fundo)' }),
  'android-icon-foreground.png': svg({ tamanho: 1024, proporcao: 0.56 }),
  'android-icon-background.png': `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><defs>${defs('claro')}</defs><rect width="1024" height="1024" fill="url(#fundo)"/></svg>`,
  'android-icon-monochrome.png': svg({ tamanho: 1024, proporcao: 0.56, mono: true }),
  'splash-icon.png': svg({ tamanho: 1024, proporcao: 0.9 }),
  'favicon.png': svg({ tamanho: 96, proporcao: 0.8, fundo: 'url(#fundo)', cantos: 22 }),
};

const caminhoSharp = process.argv[2];
if (!caminhoSharp) {
  console.log('SVGs gerados em assets/marca. Passe o caminho do sharp para gerar os PNGs.');
  process.exit(0);
}
const sharp = createRequire(import.meta.url)(caminhoSharp);
for (const [nome, conteudo] of Object.entries(PNGS)) {
  await sharp(Buffer.from(conteudo)).png().toFile(join(raiz, 'assets', nome));
  console.log('ok', nome);
}
