import 'dotenv/config';

const obrigatorias = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GOOGLE_CLIENT_ID'];
const faltando = obrigatorias.filter((nome) => !process.env[nome]);
if (faltando.length) {
  // Local: copie .env.example para .env. No Netlify: Site configuration > Environment variables.
  throw new Error(`Variáveis de ambiente ausentes: ${faltando.join(', ')}. Copie .env.example para .env e preencha.`);
}

const lista = (valor) => String(valor ?? '').split(',').map((s) => s.trim()).filter(Boolean);

export const config = {
  port: Number(process.env.PORT) || 3000,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  // Client IDs aceitos no login: web + (opcional) Android e iOS
  googleAudiences: [process.env.GOOGLE_CLIENT_ID, ...lista(process.env.GOOGLE_CLIENT_IDS_NATIVOS)],
  // Origens liberadas para chamar a API com cookie (ex.: Expo web em desenvolvimento)
  corsOrigens: lista(process.env.CORS_ORIGENS ?? 'http://localhost:8081'),
  tzOffset: process.env.TZ_OFFSET || '-03:00',
};
