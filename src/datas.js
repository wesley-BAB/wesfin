import { config } from './config.js';

// Datas "locais" usam o fuso configurado em TZ_OFFSET (ex.: -03:00),
// independente do fuso do servidor.
function offsetMinutos(offset = config.tzOffset) {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
  if (!m) return 0;
  const total = Number(m[2]) * 60 + Number(m[3]);
  return m[1] === '-' ? -total : total;
}

export function partesLocais(data) {
  const d = new Date(data.getTime() + offsetMinutos() * 60_000);
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
}

// Índice sequencial de mês (facilita iterar meses).
export const indiceMes = ({ ano, mes }) => ano * 12 + (mes - 1);
export const mesDoIndice = (i) => ({ ano: Math.floor(i / 12), mes: (i % 12) + 1 });

export const pad = (n) => String(n).padStart(2, '0');

// 'YYYY-MM-01'
export const competencia = ({ ano, mes }) => `${ano}-${pad(mes)}-01`;
export const indiceDeCompetencia = (texto) => indiceMes({ ano: Number(texto.slice(0, 4)), mes: Number(texto.slice(5, 7)) });

// Data de vencimento no mês, ajustando dia 31 em meses mais curtos.
export function vencimento({ ano, mes }, dia) {
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return `${ano}-${pad(mes)}-${pad(Math.min(dia, ultimoDia))}T12:00:00${config.tzOffset}`;
}

export const mesAtual = () => partesLocais(new Date());

// Intervalo [inicio, fim) do mês local atual, em ISO.
export function intervaloMesAtual() {
  const { ano, mes } = mesAtual();
  const proximo = mesDoIndice(indiceMes({ ano, mes }) + 1);
  return {
    inicio: `${competencia({ ano, mes })}T00:00:00${config.tzOffset}`,
    fim: `${competencia(proximo)}T00:00:00${config.tzOffset}`,
  };
}
