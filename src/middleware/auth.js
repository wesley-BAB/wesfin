import { db, q, HttpError } from '../db.js';
import { lerToken, validarSessao } from '../services/sessoes.js';
import { idOpcional } from '../validacao.js';

export async function autenticar(req, res, next) {
  const sessao = await validarSessao(lerToken(req, 'usuario'), 'usuario');
  if (!sessao) throw new HttpError(401, 'Faça login para continuar');
  const usuario = await q(db.from('usuarios').select('id, email').eq('id', sessao.usuario_id).maybeSingle());
  if (!usuario) throw new HttpError(401, 'Faça login para continuar');
  req.sessao = sessao;
  req.usuario = usuario;
  next();
}

export async function autenticarAdmin(req, res, next) {
  const sessao = await validarSessao(lerToken(req, 'admin'), 'admin');
  if (!sessao) throw new HttpError(401, 'Faça login para continuar');
  const admin = await q(db.from('administradores').select('id, usuario').eq('id', sessao.admin_id).maybeSingle());
  if (!admin) throw new HttpError(401, 'Faça login para continuar');
  req.sessao = sessao;
  req.admin = admin;
  next();
}

export async function papelNaConta(contaId, usuarioId) {
  const membro = await q(
    db.from('conta_membros').select('papel').eq('conta_id', contaId).eq('usuario_id', usuarioId).maybeSingle(),
  );
  return membro?.papel ?? null;
}

// Exige o cabeçalho X-Conta-Id e confirma que o usuário tem acesso a ela.
export async function exigirConta(req, res, next) {
  const contaId = idOpcional(req.headers['x-conta-id'], 'Conta');
  if (!contaId) throw new HttpError(400, 'Selecione uma conta');
  const papel = await papelNaConta(contaId, req.usuario.id);
  if (!papel) throw new HttpError(403, 'Você não tem acesso a esta conta');
  req.conta = { id: contaId, papel };
  next();
}
