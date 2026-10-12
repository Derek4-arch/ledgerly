#!/usr/bin/env node
/*
 * Tiny zero-dependency static server for Ledgerly so the PWA (install + offline) works.
 * Usage: node serve.js [port] [--open]     (default port 8080, binds to localhost only)
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const ROOT = __dirname;
const args = process.argv.slice(2);
const wantOpen = args.includes('--open');
let port = parseInt(args.find((a) => /^\d+$/.test(a)) || process.env.PORT || '8080', 10);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400); return res.end('Bad request'); }
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT + path.sep) && file !== ROOT) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    const ext = path.extname(file).toLowerCase();
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    };
    if (path.basename(file) === 'sw.js') headers['Service-Worker-Allowed'] = '/';
    res.writeHead(200, headers);
    fs.createReadStream(file).pipe(res);
  });
});

let tries = 0;
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE' && tries < 10) { tries++; port++; server.listen(port, '127.0.0.1'); }
  else { console.error('Could not start server:', e.message); process.exit(1); }
});
server.listen(port, '127.0.0.1', () => {
  const url = `http://localhost:${port}/`;
  console.log('');
  console.log('  Ledgerly is running at ' + url);
  console.log('  Keep this window open while you use it. Press Ctrl+C to stop.');
  console.log('  Your data stays in your browser on this computer.');
  console.log('');
  if (wantOpen) {
    const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
    exec(cmd, () => {});
  }
});
