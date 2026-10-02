'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4175);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.woff2': 'font/woff2',
};

function isInside(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}

const server = http.createServer(async (req, res) => {
  const reply = (status, message) => {
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(req.method === 'HEAD' ? undefined : message);
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return reply(405, 'Method not allowed');
  }

  let requestPath;
  try {
    requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
  } catch {
    return reply(400, 'Invalid URL');
  }

  // Validate before resolving: never normalize a traversal request into a valid URL.
  const segments = requestPath.split(/[\\/]/);
  if (!requestPath.startsWith('/') || /[\0:]/.test(requestPath) || segments.some(segment => segment.startsWith('.'))) {
    return reply(403, 'Forbidden');
  }
  if (requestPath.endsWith('/')) requestPath += 'index.html';

  const target = path.resolve(ROOT, '.' + requestPath);
  if (!isInside(ROOT, target)) return reply(403, 'Forbidden');

  try {
    // Resolve symlinks too, so a link cannot expose files outside the game folder.
    const [realRoot, realTarget] = await Promise.all([fs.realpath(ROOT), fs.realpath(target)]);
    if (!isInside(realRoot, realTarget)) return reply(403, 'Forbidden');
    const stat = await fs.stat(realTarget);
    if (!stat.isFile()) return reply(404, 'Not found');
    const content = await fs.readFile(realTarget);
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(realTarget).toLowerCase()] || 'application/octet-stream',
      'Content-Length': content.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return reply(404, 'Not found');
    console.error('Unable to read requested file:', error.message);
    reply(500, 'Internal server error');
  }
});

server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${PORT} is already in use. Set PORT to another number, or open index.html directly.`
    : error.message);
  process.exitCode = 1;
});

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error('PORT must be an integer between 1 and 65535.');
  process.exitCode = 1;
} else {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Xiaohe Game Library: http://127.0.0.1:${PORT}`);
    console.log('Press Ctrl+C to stop.');
  });
}
