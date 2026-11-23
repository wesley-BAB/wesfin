import { Router } from 'express';
import { db, q, HttpError } from '../db.js';
import { autenticarAdmin } from '../middleware/auth.js';
import { registrarLog } from '../services/logs.js';
import { criarSessao, entregarSessao, gravarCookie, lerToken, revogarSessao } from '../services/sessoes.js';
import { conferirSenha } from '../senha.js';
import * as v from '../validacao.js';
import treinamentoRobo from './adminRobo.js';

const router = Router();

// Bloqueio contra força bruta, registrado no banco: 5 erros por IP a cada 15 minutos.
const JANELA_MS = 15 * 60_000;
const MAX_TENTATIVAS = 5;

async function verificarBloqueio(ip) {
  const desde = new Date(Date.now() - JANELA_MS).toISOString();
  const { count, error } = await db
    .from('tentativas_login')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .eq('sucesso', false)
    .gte('criado_em', desde);
  if (error) throw new Error(`Supabase: ${error.message}`);
  if ((count ?? 0) >= MAX_TENTATIVAS) throw new HttpError(429, 'Muitas tentativas. Aguarde 15 minutos.');
}

router.post('/login', async (req, res) => {
  await verificarBloqueio(req.ip);
  const usuario = String(req.body?.usuario ?? '').trim().toLowerCase().slice(0, 60);
  const senha = String(req.body?.senha ?? '');
  const admin = usuario ? await q(db.from('administradores').select('*').eq('usuario', usuario).maybeSingle()) : null;
  const ok = Boolean(admin) && (await conferirSenha(senha, admin.senha_hash));
  await q(db.from('tentativas_login').insert({ ip: req.ip, usuario, sucesso: ok }));
  if (!ok) throw new HttpError(401, 'Usuário ou senha inválidos');

  await q(db.from('administradores').update({ ultimo_login: new Date().toISOString() }).eq('id', admin.id));
  await registrarLog(req, 'admin.login', { entidade: 'administrador', entidadeId: admin.id, detalhes: { admin: admin.usuario } });
  const token = await criarSessao(req, 'admin', { adminId: admin.id });
  res.json({ usuario: admin.usuario, ...entregarSessao(req, res, 'admin', token) });
});

router.post('/sair', async (req, res) => {
  await revogarSessao(lerToken(req, 'admin'));
  gravarCookie(req, res, 'admin', null);
  res.status(204).end();
});

router.use(autenticarAdmin);

router.get('/me', (req, res) => res.json({ usuario: req.admin.usuario }));

router.use('/robo', treinamentoRobo);

// Todos os usuários do sistema, com contagens para ajudar na decisão de excluir.
async function contar(tabela, campo, valor) {
  const { count, error } = await db.from(tabela).select('id', { count: 'exact', head: true }).eq(campo, valor);
  if (error) throw new Error(`Supabase: ${error.message}`);
  return count ?? 0;
}

router.get('/usuarios', async (req, res) => {
  const usuarios = await q(
    db.from('usuarios').select('id, nome, email, foto_url, criado_em, ultimo_login').order('criado_em', { ascending: false }),
  );
  const lista = await Promise.all(
    usuarios.map(async (u) => ({
      ...u,
      contas: await contar('contas', 'dono_id', u.id),
      lancamentos: await contar('transacoes', 'criado_por', u.id),
    })),
  );
  res.json(lista);
});

// Exclui o usuário e, em cascata, as contas das quais é dono (com lançamentos),
// suas categorias e seus acessos a contas de outras pessoas.
router.delete('/usuarios/:id', async (req, res) => {
  const id = v.id(req.params.id);
  const usuario = await q(db.from('usuarios').select('id, nome, email').eq('id', id).maybeSingle());
  if (!usuario) throw new HttpError(404, 'Usuário não encontrado');
  await q(db.from('conta_membros').delete().eq('email', usuario.email));
  await q(db.from('usuarios').delete().eq('id', id));
  await registrarLog(req, 'admin.excluir_usuario', {
    entidade: 'usuario',
    entidadeId: id,
    detalhes: { admin: req.admin.usuario, email: usuario.email, nome: usuario.nome },
  });
  res.status(204).end();
});

export default router;
