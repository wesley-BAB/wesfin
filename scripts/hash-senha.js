// Gera o hash de uma senha de administrador para gravar em public.administradores.
// Uso: node scripts/hash-senha.js "minha-senha"
import { gerarHashSenha } from '../src/senha.js';

const senha = process.argv[2];
if (!senha) {
  console.error('Uso: node scripts/hash-senha.js "minha-senha"');
  process.exit(1);
}
console.log(await gerarHashSenha(senha));
