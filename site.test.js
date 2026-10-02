'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const entries = ['index.html','games/mahjong/index.html','games/fishing/index.html'];

test('all game entrypoints and their local assets resolve under a GitHub Pages project path', () => {
  const base = 'https://example.github.io/youxi-ku/';
  for (const entry of entries) {
    const html = fs.readFileSync(path.join(root, entry), 'utf8');
    for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) {
      const value = match[1];
      if (/^(?:https?:|data:|#|mailto:)/i.test(value)) continue;
      const target = new URL(value, base + entry);
      assert.ok(target.pathname.startsWith('/youxi-ku/'), `${entry}: link leaves project base: ${value}`);
      let local = decodeURIComponent(target.pathname.slice('/youxi-ku/'.length));
      if (local.endsWith('/')) local += 'index.html';
      assert.ok(fs.existsSync(path.join(root, local)), `${entry}: missing local asset ${local}`);
    }
  }
});

test('both games retain separate save keys and original credit', () => {
  const source = entries.slice(1).map(entry => {
    const directory = path.dirname(path.join(root, entry));
    const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
    assert.match(html, /贺义制作/);
    return fs.readFileSync(path.join(directory, 'app.js'), 'utf8');
  });
  const saveKey = script => script.match(/(?:SAVE_KEY|STORAGE_KEY|KEY)\s*=\s*['"]([^'"]+)['"]/);
  const keys = source.map(saveKey);
  assert.ok(keys.every(Boolean), 'each game declares an explicit storage key');
  assert.notEqual(keys[0][1], keys[1][1], 'games must never overwrite each other’s progress');
});

test('game pages declare a mobile viewport and keep game navigation accessible', () => {
  for (const entry of entries) {
    const html = fs.readFileSync(path.join(root, entry), 'utf8');
    assert.match(html, /name=["']viewport["'][^>]*width=device-width/);
    assert.doesNotMatch(html, /user-scalable\s*=\s*no/);
    if (entry !== 'index.html') assert.match(html, /href=["']\.\.\/\.\.\/(?:index\.html)?["']/);
  }
});
