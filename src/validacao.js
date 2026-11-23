import { HttpError } from './db.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COR = /^#[0-9a-f]{6}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function texto(valor, campo, { max = 120 } = {}) {
  if (typeof valor !== 'string' || !valor.trim()) throw new HttpError(400, `Informe ${campo}`);
  const limpo = valor.trim();
  if (limpo.length > max) throw new HttpError(400, `${campo} deve ter até ${max} caracteres`);
  return limpo;
}

export function dinheiro(valor) {
  const numero = typeof valor === 'string' ? Number(valor.replace(',', '.')) : Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) throw new HttpError(400, 'Valor deve ser maior que zero');
  if (numero > 999_999_999) throw new HttpError(400, 'Valor muito alto');
  return Math.round(numero * 100) / 100;
}

export function umDe(valor, opcoes, campo) {
  if (!opcoes.includes(valor)) throw new HttpError(400, `${campo} inválido`);
  return valor;
}

export function data(valor, campo = 'data') {
  const d = new Date(valor);
  if (!valor || Number.isNaN(d.getTime())) throw new HttpError(400, `${campo} inválida`);
  return d;
}

export function idOpcional(valor, campo) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (!UUID.test(String(valor))) throw new HttpError(400, `${campo} inválido`);
  return String(valor);
}

export function id(valor, campo = 'id') {
  const v = idOpcional(valor, campo);
  if (!v) throw new HttpError(400, `${campo} inválido`);
  return v;
}

export function cor(valor) {
  if (valor === undefined) return undefined;
  if (!COR.test(String(valor))) throw new HttpError(400, 'Cor inválida');
  return String(valor).toLowerCase();
}

export function email(valor) {
  const v = String(valor || '').trim().toLowerCase();
  if (!EMAIL.test(v)) throw new HttpError(400, 'E-mail inválido');
  return v;
}

export function diaDoMes(valor) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1 || n > 31) throw new HttpError(400, 'Dia de vencimento deve ser entre 1 e 31');
  return n;
}
