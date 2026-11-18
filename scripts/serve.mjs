// Локальный просмотр: node scripts/serve.mjs  ->  http://localhost:8080
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const T = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.xml': 'application/xml', '.txt': 'text/plain', '.svg': 'image/svg+xml' };
http.createServer((q, s) => {
  let u = decodeURIComponent(q.url.split('?')[0]), f = path.join(dist, u);
  if (!f.startsWith(dist)) { s.writeHead(403); return s.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) { if (!u.endsWith('/')) { s.writeHead(301, { Location: u + '/' }); return s.end(); } f = path.join(f, 'index.html'); }
  if (!fs.existsSync(f)) { s.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); return s.end(fs.readFileSync(path.join(dist, '404.html'))); }
  s.writeHead(200, { 'Content-Type': (T[path.extname(f)] || 'application/octet-stream') + '; charset=utf-8' }); s.end(fs.readFileSync(f));
}).listen(8080, () => console.log('http://localhost:8080'));
