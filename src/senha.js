import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

// Formato: scrypt$<salt hex>$<hash hex>
export async function gerarHashSenha(senha) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(senha, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function conferirSenha(senha, armazenado) {
  const [algoritmo, saltHex, hashHex] = String(armazenado).split('$');
  if (algoritmo !== 'scrypt' || !saltHex || !hashHex) return false;
  const esperado = Buffer.from(hashHex, 'hex');
  const calculado = await scryptAsync(String(senha), Buffer.from(saltHex, 'hex'), esperado.length);
  return timingSafeEqual(calculado, esperado);
}
