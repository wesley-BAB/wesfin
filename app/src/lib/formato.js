export const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const p2 = (n) => String(n).padStart(2, '0');
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export const dataCurta = (d) => `${p2(new Date(d).getDate())} ${MESES[new Date(d).getMonth()]}`;
export const hora = (d) => `${p2(new Date(d).getHours())}:${p2(new Date(d).getMinutes())}`;
export const dataHora = (d) => {
  const x = new Date(d);
  return `${p2(x.getDate())}/${p2(x.getMonth() + 1)}/${String(x.getFullYear()).slice(2)} ${hora(x)}`;
};
export const diaSemana = (d) => DIAS[new Date(d).getDay()];

// Intervalo [inicio, fim) do período de referência.
export function periodo(modo, ref) {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  if (modo === 'dia') {
    const fim = new Date(d); fim.setDate(fim.getDate() + 1);
    return { inicio: d, fim, rotulo: `${diaSemana(d)}, ${dataCurta(d)} ${d.getFullYear()}` };
  }
  if (modo === 'semana') {
    const inicio = new Date(d);
    inicio.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // segunda-feira
    const fim = new Date(inicio); fim.setDate(inicio.getDate() + 7);
    const ultimo = new Date(fim); ultimo.setDate(fim.getDate() - 1);
    return { inicio, fim, rotulo: `${dataCurta(inicio)} – ${dataCurta(ultimo)}` };
  }
  const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
  const fim = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { inicio, fim, rotulo: `${MESES_LONGOS[d.getMonth()]} ${d.getFullYear()}` };
}

export function navegar(modo, ref, passo) {
  const d = new Date(ref);
  if (modo === 'dia') d.setDate(d.getDate() + passo);
  else if (modo === 'semana') d.setDate(d.getDate() + 7 * passo);
  else { d.setDate(1); d.setMonth(d.getMonth() + passo); }
  return d;
}

export function lerNumero(texto) {
  let s = String(texto).trim().replace(/^r\$\s*/i, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  return Number(s);
}

// "2026-11-18 14:30" <-> Date (campo de data/hora digitável em todas as plataformas)
export const paraCampoData = (d) => {
  const x = new Date(d);
  return `${p2(x.getDate())}/${p2(x.getMonth() + 1)}/${x.getFullYear()} ${hora(x)}`;
};
export function lerCampoData(texto) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/.exec(String(texto).trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] ?? 12), Number(m[5] ?? 0));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function totais(lista) {
  const soma = (f) => lista.filter(f).reduce((s, t) => s + Number(t.valor), 0);
  const conta = (f) => lista.filter(f).length;
  return {
    entradas: soma((t) => t.tipo === 'entrada' && t.status === 'pago'),
    saidas: soma((t) => t.tipo === 'saida' && t.status === 'pago'),
    investimentos: soma((t) => t.tipo === 'investimento' && t.status === 'pago'),
    aReceber: soma((t) => t.tipo === 'entrada' && t.status === 'a_pagar'),
    aPagar: soma((t) => t.tipo === 'saida' && t.status === 'a_pagar'),
    qtdAPagar: conta((t) => t.tipo === 'saida' && t.status === 'a_pagar'),
    qtdAReceber: conta((t) => t.tipo === 'entrada' && t.status === 'a_pagar'),
  };
}

// Visual de cada tipo de lançamento (ícone + cores; nunca só a cor). 	om indexa useCores().
export const TIPOS = {
  entrada: { rotulo: 'Entrada', plural: 'Entradas', icone: 'arrow-down-left', cor: '#1baf7a', tom: 'entrada', fundo: 'bg-entrada-fundo', sinal: '+' },
  saida: { rotulo: 'Saída', plural: 'Saídas', icone: 'arrow-up-right', cor: '#e34948', tom: 'saida', fundo: 'bg-saida-fundo', sinal: '−' },
  investimento: { rotulo: 'Investimento', plural: 'Investimentos', icone: 'trending-up', cor: '#2a78d6', tom: 'investimento', fundo: 'bg-investimento-fundo', sinal: '→' },
};

// Paleta categórica validada para as cores de categoria.
export const PALETA = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948', '#898781'];
