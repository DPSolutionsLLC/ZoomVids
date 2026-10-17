import { readFileSync } from 'node:fs';

const pageUrl = new URL('../public/index.html', import.meta.url);

export function readPage() {
  return readFileSync(pageUrl, 'utf8');
}

export function loadModule(name) {
  const lines = readPage().split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith('var ' + name + ' = (function () {'));
  if (start < 0) throw new Error('Module ' + name + ' not found in index.html');
  const end = lines.findIndex((line, index) => index > start && line === '})();');
  if (end < 0) throw new Error('Module ' + name + ' not found in index.html');
  const source = lines.slice(start, end + 1).join('\n');
  return new Function(source + '\nreturn ' + name + ';')();
}

export function loadVolume(vol) {
  return JSON.parse(readFileSync(new URL('../public/scriptures/' + vol + '.json', import.meta.url), 'utf8'));
}
