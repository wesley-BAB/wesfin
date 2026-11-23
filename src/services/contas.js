import { db, q } from '../db.js';

// Cores seguem a ordem da paleta categórica (validada para daltonismo).
const CATEGORIAS_PADRAO = [
  { nome: 'Alimentação', tipo: 'saida', cor: '#2a78d6' },
  { nome: 'Moradia', tipo: 'saida', cor: '#eb6834' },
  { nome: 'Transporte', tipo: 'saida', cor: '#1baf7a' },
  { nome: 'Lazer', tipo: 'saida', cor: '#eda100' },
  { nome: 'Saúde', tipo: 'saida', cor: '#e87ba4' },
  { nome: 'Contas', tipo: 'saida', cor: '#6250d6' },
  { nome: 'Educação', tipo: 'saida', cor: '#008300' },
  { nome: 'Salário', tipo: 'entrada', cor: '#008300' },
  { nome: 'Extra', tipo: 'entrada', cor: '#1baf7a' },
  { nome: 'Investimentos', tipo: 'investimento', cor: '#2a78d6' },
  { nome: 'Outros', tipo: 'ambos', cor: '#898781' },
];

export async function criarConta(usuario, nome) {
  const conta = await q(db.from('contas').insert({ nome, dono_id: usuario.id }).select().single());
  await q(db.from('conta_membros').insert({ conta_id: conta.id, email: usuario.email, usuario_id: usuario.id, papel: 'dono' }));
  return conta;
}

export async function criarCategoriasPadrao(usuarioId) {
  await q(db.from('categorias').insert(CATEGORIAS_PADRAO.map((c) => ({ ...c, usuario_id: usuarioId }))));
}

export async function contasDoUsuario(usuarioId) {
  const linhas = await q(
    db.from('conta_membros')
      .select('papel, conta:contas(id, nome, dono_id, criado_em)')
      .eq('usuario_id', usuarioId)
      .order('criado_em'),
  );
  return linhas.filter((l) => l.conta).map((l) => ({ ...l.conta, papel: l.papel }));
}
