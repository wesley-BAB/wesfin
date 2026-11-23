import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';
import { db, q, HttpError } from '../db.js';
import { autenticar, papelNaConta } from '../middleware/auth.js';
import { contasDoUsuario, criarCategoriasPadrao, criarConta } from '../services/contas.js';
import { registrarLog } from '../services/logs.js';
import { criarSessao, entregarSessao, gravarCookie, lerToken, revogarSessao } from '../services/sessoes.js';
import * as v from '../validacao.js';

const router = Router();
const google = new OAuth2Client();

const publico = (u) => ({ id: u.id, email: u.email, nome: u.nome, foto_url: u.foto_url });

// Recebe o ID token do Google, valida, cria/atualiza o usuário na tabela
// `usuarios` e abre uma sessão registrada no banco.
router.post('/google', async (req, res) => {
  const credencial = req.body?.credential;
  if (!credencial) throw new HttpError(400, 'Token do Google ausente');

  let payload;
  try {
    const ticket = await google.verifyIdToken({ idToken: credencial, audience: config.googleAudiences });
    payload = ticket.getPayload();
  } catch {
    throw new HttpError(401, 'Não foi possível validar o login do Google');
  }
  if (!payload?.email || !payload.email_verified) throw new HttpError(401, 'E-mail do Google não verificado');

  const email = payload.email.toLowerCase();
  const dados = {
    google_sub: payload.sub,
    email,
    nome: payload.name ?? email,
    foto_url: payload.picture ?? null,
    ultimo_login: new Date().toISOString(),
  };
  const existente = await q(db.from('usuarios').select('id').eq('google_sub', payload.sub).maybeSingle());
  const usuario = existente
    ? await q(db.from('usuarios').update(dados).eq('id', existente.id).select().single())
    : await q(db.from('usuarios').insert(dados).select().single());

  // Aceita convites de compartilhamento feitos para este e-mail.
  await q(db.from('conta_membros').update({ usuario_id: usuario.id }).eq('email', email).is('usuario_id', null));

  const temContaPropria = await q(db.from('contas').select('id').eq('dono_id', usuario.id).limit(1));
  if (!temContaPropria.length) await criarConta(usuario, 'Pessoal');
  if (!existente) await criarCategoriasPadrao(usuario.id);

  req.usuario = usuario;
  await registrarLog(req, existente ? 'usuario.login' : 'usuario.cadastro', { entidade: 'usuario', entidadeId: usuario.id, detalhes: { email } });

  const token = await criarSessao(req, 'usuario', { usuarioId: usuario.id });
  res.json({ usuario: publico(usuario), ...entregarSessao(req, res, 'usuario', token) });
});

router.post('/sair', async (req, res) => {
  await revogarSessao(lerToken(req, 'usuario'));
  gravarCookie(req, res, 'usuario', null);
  res.status(204).end();
});

router.get('/me', autenticar, async (req, res) => {
  const usuario = await q(db.from('usuarios').select('*').eq('id', req.usuario.id).single());
  res.json({ usuario: publico(usuario), contas: await contasDoUsuario(usuario.id), preferencias: usuario.preferencias ?? {} });
});

// Preferências ficam no banco (conta atual, visão do período e tema), não no navegador.
router.patch('/preferencias', autenticar, async (req, res) => {
  const atual = (await q(db.from('usuarios').select('preferencias').eq('id', req.usuario.id).single())).preferencias ?? {};
  const novas = { ...atual };
  if (req.body?.conta_atual !== undefined) {
    const contaId = v.id(req.body.conta_atual, 'Conta');
    if (!(await papelNaConta(contaId, req.usuario.id))) throw new HttpError(403, 'Você não tem acesso a esta conta');
    novas.conta_atual = contaId;
  }
  if (req.body?.modo_periodo !== undefined) novas.modo_periodo = v.umDe(req.body.modo_periodo, ['dia', 'semana', 'mes'], 'Período');
  if (req.body?.tema !== undefined) novas.tema = v.umDe(req.body.tema, ['claro', 'escuro'], 'Tema');
  await q(db.from('usuarios').update({ preferencias: novas }).eq('id', req.usuario.id));
  res.json(novas);
});

export default router;
