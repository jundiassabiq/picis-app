import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { copyStatic, dist, esbuildArgs, esbuildBinary } from './esbuild-bin.mjs';

const port = Number(process.env.PORT ?? 5173);

copyStatic();

const child = spawn(esbuildBinary(), esbuildArgs('dev'), { stdio: 'inherit' });
child.on('exit', (code) => {
  if (code) process.exit(code);
});

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';

  const file = path.normalize(path.join(dist, pathname));
  if (!file.startsWith(dist)) {
    res.writeHead(403).end('forbidden');
    return;
  }

  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(file).pipe(res);
    return;
  }

  // SPA fallback keeps deep links like /transactions?month=2026-11 working.
  const index = path.join(dist, 'index.html');
  if (fs.existsSync(index)) {
    res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
    fs.createReadStream(index).pipe(res);
    return;
  }

  res.writeHead(503).end('build sedang berjalan, muat ulang sebentar lagi');
});

server.listen(port, '127.0.0.1', () => {
  console.log(`duitku dev server: http://127.0.0.1:${port}`);
});

const shutdown = () => {
  child.kill();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 800);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
