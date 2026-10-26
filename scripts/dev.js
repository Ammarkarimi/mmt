/* Local development server: serves public/ and the API on one port (default 8080). */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/app.js';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const port = Number(process.env.PORT || 8080);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json',
};

const app = createApp();

async function serveStatic(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost');
  let file = normalize(join(root, decodeURIComponent(pathname)));
  if (!file.startsWith(root.endsWith(sep) ? root : root + sep) && file !== root.slice(0, -1)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    await stat(file);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  if (req.url.startsWith('/api/') || req.url === '/api') app(req, res);
  else serveStatic(req, res);
}).listen(port, () => {
  console.log(`TripSaathi running at http://localhost:${port}`);
  console.log(app.config.ephemeral ? 'Database: in-memory PGlite (demo data, resets on restart)' : 'Database: PostgreSQL');
  // Warm up the database so the first page load is fast.
  app.getDb().then(() => console.log('Database ready'), (err) => console.error('Database failed to start:', err.message));
});
