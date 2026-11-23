import { Router } from 'express';
import { db, q, HttpError } from '../db.js';
import { papelNaConta } from '../middleware/auth.js';
import { contasDoUsuario, criarConta } from '../services/contas.js';
import { registrarLog } from '../services/logs.js';
import * as v from '../validacao.js';

const router = Router();

async function exigirPapel(req, contaId, ...papeis) {
  const papel = await papelNaConta(contaId, req.usuario.id);
  if (!papel) throw new HttpError(403, 'Você não tem acesso a esta conta');
  if (papeis.length && !papeis.includes(papel)) throw new HttpError(403, 'Apenas o dono da conta pode fazer isso');
  return papel;
}

router.get('/', async (req, res) => {
  res.json(await contasDoUsuario(req.usuario.id));
});

router.post('/', async (req, res) => {
  const nome = v.texto(req.body?.nome, 'o nome da conta', { max: 60 });
  const conta = await criarConta(req.usuario, nome);
  await registrarLog(req, 'conta.criar', { contaId: conta.id, entidade: 'conta', entidadeId: conta.id, detalhes: { nome } });
  res.status(201).json({ ...conta, papel: 'dono' });
});

router.patch('/:id', async (req, res) => {
  const contaId = v.id(req.params.id);
  await exigirPapel(req, contaId, 'dono');
  const nome = v.texto(req.body?.nome, 'o nome da conta', { max: 60 });
  const conta = await q(db.from('contas').update({ nome }).eq('id', contaId).select().single());
  await registrarLog(req, 'conta.renomear', { contaId, entidade: 'conta', entidadeId: contaId, detalhes: { nome } });
  res.json(conta);
});

router.get('/:id/membros', async (req, res) => {
  const contaId = v.id(req.params.id);
  await exigirPapel(req, contaId);
  const membros = await q(
    db.from('conta_membros')
      .select('id, email, papel, criado_em, usuario:usuarios(nome, foto_url)')
      .eq('conta_id', contaId)
      .order('criado_em'),
  );
  res.json(membros);
});

// Compartilha a conta com outro Gmail. Se a pessoa ainda não usa o WESFIN,
// o convite fica pendente e é aceito no primeiro login dela.
router.post('/:id/membros', async (req, res) => {
  const contaId = v.id(req.params.id);
  await exigirPapel(req, contaId, 'dono');
  const email = v.email(req.body?.email);
  const usuario = await q(db.from('usuarios').select('id').eq('email', email).maybeSingle());
  const membro = await q(
    db.from('conta_membros')
      .insert({ conta_id: contaId, email, usuario_id: usuario?.id ?? null, papel: 'editor' })
      .select('id, email, papel, criado_em, usuario:usuarios(nome, foto_url)')
      .single(),
  );
  await registrarLog(req, 'conta.compartilhar', { contaId, entidade: 'membro', entidadeId: membro.id, detalhes: { email } });
  res.status(201).json(membro);
});

// O dono remove qualquer membro; um editor pode remover a si mesmo (sair da conta).
router.delete('/:id/membros/:membroId', async (req, res) => {
  const contaId = v.id(req.params.id);
  const membroId = v.id(req.params.membroId);
  const papel = await exigirPapel(req, contaId);
  const membro = await q(db.from('conta_membros').select('*').eq('id', membroId).eq('conta_id', contaId).maybeSingle());
  if (!membro) throw new HttpError(404, 'Membro não encontrado');
  if (membro.papel === 'dono') throw new HttpError(400, 'O dono não pode ser removido da conta');
  if (papel !== 'dono' && membro.usuario_id !== req.usuario.id) throw new HttpError(403, 'Apenas o dono da conta pode fazer isso');
  await q(db.from('conta_membros').delete().eq('id', membroId));
  await registrarLog(req, 'conta.remover_membro', { contaId, entidade: 'membro', entidadeId: membroId, detalhes: { email: membro.email } });
  res.status(204).end();
});

export default router;
