import { Router } from 'express';
import { db, q } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const limite = Math.min(Math.max(Number(req.query.limite) || 100, 1), 500);
  const logs = await q(
    db.from('logs')
      .select('id, acao, entidade, entidade_id, detalhes, criado_em, usuario:usuarios(nome, email)')
      .eq('conta_id', req.conta.id)
      .order('criado_em', { ascending: false })
      .limit(limite),
  );
  res.json(logs);
});

export default router;
