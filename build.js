'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const output = path.join(root, 'dist');
const allowed = new Set(['.html','.css','.js','.png','.jpg','.jpeg','.svg','.webp','.ico','.webmanifest']);
const isPublic = name => !name.endsWith('.test.js') && !['server.js','build.js'].includes(name);
fs.mkdirSync(output, { recursive: true });
function copy(directory, relative = '') {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const next = path.join(relative, item.name), source = path.join(directory, item.name);
    if (item.isDirectory()) {
      if (relative || ['assets','games'].includes(item.name)) copy(source, next);
    } else if (item.name === '.nojekyll' || allowed.has(path.extname(item.name)) && isPublic(item.name)) {
      const destination = path.join(output, next);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
    }
  }
}
copy(root);
console.log('Static site built in dist/ — no external runtime dependencies.');
