import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

export const db = createClient(config.supabaseUrl, config.supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export class HttpError extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

// Executa uma consulta do Supabase e devolve os dados ou lança o erro.
export async function q(consulta) {
  const { data, error } = await consulta;
  if (error) {
    if (error.code === '23505') throw new HttpError(409, 'Registro já existe');
    throw new Error(`Supabase: ${error.message}`);
  }
  return data;
}
