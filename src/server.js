import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { autenticar, exigirConta } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import contasRoutes from './routes/contas.js';
import categoriasRoutes from './routes/categorias.js';
import transacoesRoutes from './routes/transacoes.js';
import recorrenciasRoutes from './routes/recorrencias.js';
import chatRoutes from './routes/chat.js';
import logsRoutes from './routes/logs.js';
import adminRoutes from './routes/admin.js';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
  });
  next();
});

// CORS só para as origens configuradas (ex.: Expo web em desenvolvimento), com cookie.
app.use('/api', (req, res, next) => {
  const origem = req.headers.origin;
  if (origem && config.corsOrigens.includes(origem)) {
    res.set({
      'Access-Control-Allow-Origin': origem,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Conta-Id',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      Vary: 'Origin',
    });
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.use(express.json({ limit: '100kb' }));
// Respostas da API nunca ficam em cache (valores financeiros).
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

app.get('/api/config', (req, res) => res.json({ googleClientId: config.googleClientId }));
app.use('/api/auth', authRoutes);
app.use('/api/contas', autenticar, contasRoutes);
app.use('/api/categorias', autenticar, categoriasRoutes);
app.use('/api/transacoes', autenticar, exigirConta, transacoesRoutes);
app.use('/api/recorrencias', autenticar, exigirConta, recorrenciasRoutes);
app.use('/api/chat', autenticar, exigirConta, chatRoutes);
app.use('/api/logs', autenticar, exigirConta, logsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));

// Frontend: build web do app Expo (cd app && npm run build:web).
const web = path.join(raiz, '..', 'app', 'dist');
if (existsSync(web)) {
  app.use(express.static(web, { extensions: ['html'] }));
  app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(web, 'index.html')));
}

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ erro: status >= 500 ? 'Erro interno, tente novamente' : err.message });
});

app.listen(config.port, () => console.log(`WESFIN API rodando em http://localhost:${config.port}`));
