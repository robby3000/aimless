// dev-serve TLS static server — runs on the dev box, tailnet-only.
// Serves a docroot over HTTPS on a Tailscale IP so a phone on the tailnet
// gets a secure context (geolocation, service workers) with a real cert.
// Managed by scripts/dev-serve.sh — not meant to be run by hand. No deps.
//
// Env: DEV_ROOT (docroot), DEV_CERT, DEV_KEY, DEV_BIND, DEV_PORT.

import https from 'node:https';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';

const HOME = process.env.HOME;
const ROOT = process.env.DEV_ROOT || join(HOME, '.dev-serve/www');
const CERT = process.env.DEV_CERT || join(HOME, '.dev-serve/cert.pem');
const KEY = process.env.DEV_KEY || join(HOME, '.dev-serve/key.pem');
const BIND = process.env.DEV_BIND || '0.0.0.0';
const PORT = Number(process.env.DEV_PORT || 8444);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.txt': 'text/plain', '.kml': 'application/vnd.google-earth.kml+xml',
};

const server = https.createServer(
  { cert: await readFile(CERT), key: await readFile(KEY) },
  async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'https://x').pathname);
      const clean = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
      let file = join(ROOT, clean);
      if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      res.writeHead(200, {
        'content-type': MIME[extname(file)] || 'application/octet-stream',
        'cache-control': 'no-cache', // dev iteration: the phone never caches shell files
      });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  },
);
server.listen(PORT, BIND, () => console.log(`dev-serve: https://${BIND}:${PORT} serving ${ROOT}`));
