import serverless from 'serverless-http';
import app from '../../src/app.js';

// No Netlify tudo é HTTPS: o cookie de sessão sai sempre com Secure.
process.env.NODE_ENV ??= 'production';

const cabecalho = (event, nome) => event.headers?.[nome] ?? event.multiValueHeaders?.[nome]?.[0];

// A API Express como Netlify Function. O netlify.toml reescreve /api/* para cá;
// conforme o caminho que chegar, devolve o prefixo /api que as rotas esperam.
export const handler = serverless(app, {
  request(req, event) {
    req.url = req.url.replace(/^\/\.netlify\/functions\/api(?=\/|$)/, '/api');
    // Sem socket de verdade, req.ip viria vazio; o IP do cliente vem do Netlify.
    const ip = cabecalho(event, 'x-nf-client-connection-ip') ?? String(cabecalho(event, 'x-forwarded-for') ?? '').split(',')[0].trim();
    Object.defineProperty(req, 'ip', { value: ip || 'desconhecido' });
  },
});
