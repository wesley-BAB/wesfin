import { ehNativo, gravarToken, lerToken } from './sessao';

const BASE = process.env.EXPO_PUBLIC_API_URL || '';

let contaAtual = null;
let aoExpirar = () => {};

export const definirContaAtual = (id) => { contaAtual = id; };
export const quandoSessaoExpirar = (fn) => { aoExpirar = fn; };

async function chamar(caminho, { metodo = 'GET', corpo, tipo = 'usuario' } = {}) {
  const headers = {};
  if (corpo !== undefined) headers['Content-Type'] = 'application/json';
  if (tipo === 'usuario' && contaAtual) headers['X-Conta-Id'] = contaAtual;
  const token = await lerToken(tipo);
  if (token) headers.Authorization = `Bearer ${token}`;

  const resposta = await fetch(`${BASE}/api${caminho}`, {
    method: metodo,
    headers,
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    credentials: 'include', // envia o cookie de sessão (web)
  });
  const dados = resposta.status === 204 ? null : await resposta.json().catch(() => null);
  if (resposta.status === 401 && tipo === 'usuario' && caminho !== '/auth/google') aoExpirar();
  if (!resposta.ok) {
    const erro = new Error(dados?.erro || `Erro ${resposta.status}`);
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}

export const api = (caminho, opcoes) => chamar(caminho, opcoes);
export const apiAdmin = (caminho, opcoes = {}) => chamar(`/admin${caminho}`, { ...opcoes, tipo: 'admin' });

// Login: no celular o identificador volta no corpo e vai para o SecureStore;
// na web o servidor grava o cookie HttpOnly.
export async function entrarComGoogle(credential) {
  const r = await api('/auth/google', { metodo: 'POST', corpo: { credential, cliente: ehNativo ? 'nativo' : 'web' } });
  if (r.token) await gravarToken('usuario', r.token);
  return r;
}

export async function sairDaConta() {
  try { await api('/auth/sair', { metodo: 'POST', corpo: {} }); } finally { await gravarToken('usuario', null); }
}

export async function entrarAdmin(usuario, senha) {
  const r = await apiAdmin('/login', { metodo: 'POST', corpo: { usuario, senha, cliente: ehNativo ? 'nativo' : 'web' } });
  if (r.token) await gravarToken('admin', r.token);
  return r;
}

export async function sairAdmin() {
  try { await apiAdmin('/sair', { metodo: 'POST', corpo: {} }); } finally { await gravarToken('admin', null); }
}
