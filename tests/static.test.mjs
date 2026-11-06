import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Verifica declarações estáticas; não faz requisições nem valida layout/DOM do navegador.
const root = fileURLToPath(new URL('../', import.meta.url));
const ignored = new Set(['node_modules', 'tests', 'scripts', 'bd']);
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('.') || ignored.has(entry.name)) return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}
const files = walk(root);
const htmlFiles = files.filter(file => /\.html?$/i.test(file));
const cssFiles = files.filter(file => /\.css$/i.test(file));
const jsFiles = files.filter(file => /\.(?:[cm]?js)$/i.test(file));
const attributes = value => Object.fromEntries(
  [...value.matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+))/g)]
    .map(match => [match[1].toLowerCase(), match[2] ?? match[3] ?? match[4]])
);
const documents = htmlFiles.map(file => {
  const source = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const scripts = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
    .map(match => ({ attrs: attributes(match[1]), source: match[2] }));
  const styles = [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map(match => match[1]);
  const markup = source
    .replace(/(<script\b[^>]*>)[\s\S]*?<\/script\s*>/gi, '$1</script>')
    .replace(/(<style\b[^>]*>)[\s\S]*?<\/style\s*>/gi, '$1</style>');
  const elements = [...markup.matchAll(/<([a-z][\w:-]*)\b([^<>]*)>/gi)]
    .map(match => ({ tag: match[1].toLowerCase(), attrs: attributes(match[2]) }));
  return { file, elements, scripts, styles, ids: elements.flatMap(({ attrs }) => attrs.id ? [attrs.id] : []), names: elements.flatMap(({ tag, attrs }) => tag === 'a' && attrs.name ? [attrs.name] : []) };
});
const external = value => /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value);
const relativeName = file => path.relative(root, file).split(path.sep).join('/');
function resolveResource(value, host) {
  if (!value || value.startsWith('#') || external(value)) return null;
  const clean = decodeURIComponent(value.split(/[?#]/, 1)[0]).replace(/\\([ ()])/g, '$1');
  if (!clean) return null;
  const destination = path.resolve(value.startsWith('/') ? root : path.dirname(host), clean.replace(/^\/+/, ''));
  const relative = path.relative(root, destination);
  assert.ok(relative !== '..' && !relative.startsWith('..' + path.sep), 'Recurso local fora da pasta do projeto.');
  return destination;
}
function requireResource(value, host) {
  const file = resolveResource(value, host);
  if (!file) return null;
  assert.ok(fs.existsSync(file), 'Recurso local ausente, declarado em ' + relativeName(host));
  let directory = root;
  for (const part of path.relative(root, file).split(path.sep).filter(Boolean)) {
    assert.ok(fs.readdirSync(directory).includes(part), 'Grafia de recurso local divergente em ' + relativeName(host));
    directory = path.join(directory, part);
  }
  return file;
}
function cssReferences(source) {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)|@import\s+(?:"([^"]*)"|'([^']*)')/gi)]
    .map(match => (match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5]).trim());
}
test('recursos locais declarados em HTML e CSS existem', () => {
  assert.ok(htmlFiles.length > 0, 'Nenhuma página HTML encontrada.');
  for (const document of documents) {
    for (const { attrs } of document.elements) {
      for (const key of ['src', 'href', 'poster']) {
        if (attrs[key]) requireResource(attrs[key], document.file);
      }
      if (attrs.style) {
        for (const value of cssReferences(attrs.style)) requireResource(value, document.file);
      }
    }
    for (const source of document.styles) {
      for (const value of cssReferences(source)) requireResource(value, document.file);
    }
  }
  for (const file of cssFiles) {
    for (const value of cssReferences(fs.readFileSync(file, 'utf8'))) requireResource(value, file);
  }
});
test('IDs estáticos são únicos e fragmentos locais têm destino', () => {
  for (const document of documents) {
    assert.ok(new Set(document.ids).size === document.ids.length, 'IDs estáticos repetidos em ' + relativeName(document.file));
    for (const { tag, attrs } of document.elements) {
      if (tag !== 'a' || !attrs.href || attrs.href === '#' || external(attrs.href)) continue;
      const hash = attrs.href.indexOf('#');
      if (hash === -1 || hash === attrs.href.length - 1) continue;
      const target = hash === 0 ? document.file : resolveResource(attrs.href, document.file);
      const destination = documents.find(value => value.file === target);
      if (!destination) continue; // Fragmentos de SVG/PDF não são IDs de páginas HTML.
      const id = decodeURIComponent(attrs.href.slice(hash + 1));
      assert.ok(/^top$/i.test(id) || destination.ids.includes(id) || destination.names.includes(id), 'Fragmento local sem destino, declarado em ' + relativeName(document.file));
    }
  }
});
test('sintaxe dos scripts locais e blocos inline passa em node --check', () => {
  for (const file of jsFiles) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 0, 'Sintaxe JavaScript inválida em ' + relativeName(file));
  }
  for (const document of documents) {
    for (const script of document.scripts) {
      if (script.attrs.src || !script.source.trim()) continue;
      const type = (script.attrs.type ?? '').toLowerCase();
      if (type && !['module', 'text/javascript', 'application/javascript'].includes(type)) continue;
      const mode = type === 'module' ? 'module' : 'commonjs';
      const result = spawnSync(process.execPath, ['--input-type=' + mode, '--check'], { input: script.source, encoding: 'utf8', timeout: 10000 });
      assert.equal(result.status, 0, 'Sintaxe de bloco inline inválida em ' + relativeName(document.file));
    }
  }
});

