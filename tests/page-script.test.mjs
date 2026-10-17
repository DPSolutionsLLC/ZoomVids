import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readPage } from './extract-module.mjs';

test('every inline script in index.html compiles', () => {
  const scripts = [...readPage().matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  assert.ok(scripts.length > 0, 'no inline scripts found');
  scripts.forEach((body, index) => {
    assert.doesNotThrow(() => new vm.Script(body, { filename: 'index.html inline script ' + (index + 1) }));
  });
});
