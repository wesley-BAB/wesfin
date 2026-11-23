import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import api from './app.js';
import { config } from './config.js';

// Servidor local: a API + o build web do app na mesma origem.
const raiz = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(api);

// Frontend: build web do app Expo (cd app && npm run build:web).
const web = path.join(raiz, '..', 'app', 'dist');
if (existsSync(web)) {
  app.use(express.static(web, { extensions: ['html'] }));
  app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(web, 'index.html')));
}

app.listen(config.port, () => console.log(`WESFIN API rodando em http://localhost:${config.port}`));
