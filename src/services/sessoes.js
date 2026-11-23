import { createHash, randomBytes } from 'node:crypto';
import { db, q } from '../db.js';

// Sessões ficam no banco. O cliente guarda apenas um identificador aleatório
// (cookie HttpOnly na web, SecureStore no celular); no banco vai só o hash dele.
export const DURACAO = {
  usuario: 7 * 24 * 60 * 60_000, // renovada a cada uso
  admin: 8 * 60 * 60_000, // fixa
};
const RENOVAR_APOS_MS = 60 * 60_000;

export const COOKIE = { usuario: 'wesfin_sessao', admin: 'wesfin_admin' };

const hash = (token) => createHash('sha256').update(token).digest('hex');

export async function criarSessao(req, tipo, { usuarioId = null, adminId = null }) {
  const token = randomBytes(32).toString('base64url');
  await q(
    db.from('sessoes').insert({
      token_hash: hash(token),
      tipo,
      usuario_id: usuarioId,
      admin_id: adminId,
      expira_em: new Date(Date.now() + DURACAO[tipo]).toISOString(),
      ip: req.ip,
      user_agent: String(req.headers['user-agent'] ?? '').slice(0, 300),
    }),
  );
  return token;
}

export async function validarSessao(token, tipo) {
  if (!token) return null;
  const sessao = await q(
    db.from('sessoes').select('*').eq('token_hash', hash(token)).eq('tipo', tipo).is('revogada_em', null).maybeSingle(),
  );
  if (!sessao || new Date(sessao.expira_em) <= new Date()) return null;

  if (Date.now() - new Date(sessao.ultimo_uso).getTime() > RENOVAR_APOS_MS) {
    const agora = new Date();
    const dados = { ultimo_uso: agora.toISOString() };
    if (tipo === 'usuario') dados.expira_em = new Date(agora.getTime() + DURACAO.usuario).toISOString();
    await q(db.from('sessoes').update(dados).eq('id', sessao.id));
  }
  return sessao;
}

export async function revogarSessao(token) {
  if (!token) return;
  await q(db.from('sessoes').update({ revogada_em: new Date().toISOString() }).eq('token_hash', hash(token)).is('revogada_em', null));
}

// ---------- Transporte do identificador ----------

function lerCookies(req) {
  const cookies = {};
  for (const parte of String(req.headers.cookie ?? '').split(';')) {
    const i = parte.indexOf('=');
    if (i > 0) cookies[parte.slice(0, i).trim()] = decodeURIComponent(parte.slice(i + 1).trim());
  }
  return cookies;
}

// App nativo envia "Authorization: Bearer"; a web usa o cookie HttpOnly.
export function lerToken(req, tipo) {
  const cabecalho = req.headers.authorization ?? '';
  if (cabecalho.startsWith('Bearer ')) return cabecalho.slice(7);
  return lerCookies(req)[COOKIE[tipo]] ?? null;
}

export function gravarCookie(req, res, tipo, token) {
  const seguro = req.secure || process.env.NODE_ENV === 'production';
  const partes = [
    `${COOKIE[tipo]}=${token ? encodeURIComponent(token) : ''}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${token ? Math.floor(DURACAO[tipo] / 1000) : 0}`,
  ];
  if (seguro) partes.push('Secure');
  res.append('Set-Cookie', partes.join('; '));
}

// Login: web recebe o cookie; o app nativo (cliente: 'nativo') recebe o identificador no corpo.
export function entregarSessao(req, res, tipo, token) {
  if (req.body?.cliente === 'nativo') return { token };
  gravarCookie(req, res, tipo, token);
  return {};
}
