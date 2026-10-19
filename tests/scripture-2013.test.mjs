import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModule, loadVolume } from './extract-module.mjs';

const Scripture = loadModule('Scripture');
const changes = JSON.parse(readFileSync(new URL('./scripture-2013-changes.json', import.meta.url), 'utf8'));

const volumes = {};
for (const vol of ['old-testament', 'new-testament', 'book-of-mormon', 'doctrine-and-covenants', 'pearl-of-great-price']) {
  volumes[vol] = loadVolume(vol);
}

function verseText(refText) {
  const ref = Scripture.parse(refText);
  assert.ok(ref.ok, refText + ' should parse: ' + ref.error);
  assert.equal(ref.from, ref.to, refText + ' should name one verse');
  const found = Scripture.lookup(ref, volumes[ref.vol]);
  assert.ok(found.ok, refText + ' should exist: ' + found.error);
  return found.verses[0].text;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wordPattern(stem, wholeWord) {
  return new RegExp('\\b' + escapeRegex(stem) + (wholeWord ? '\\b' : '\\w*'), 'i');
}

function checkCorrection(text, entry) {
  const problems = [];
  if (!text.includes(entry.now)) problems.push('missing "' + entry.now + '"');
  if (entry.was && !entry.now.includes(entry.was) && text.includes(entry.was)) {
    problems.push('still has "' + entry.was + '"');
  }
  return problems;
}

function checkSpelling(text, entry) {
  const problems = [];
  const old = text.match(wordPattern(entry.was, entry.wholeWord));
  if (old) problems.push('still has "' + old[0] + '"');
  if (!wordPattern(entry.now, false).test(text)) problems.push('missing "' + entry.now + '"');
  return problems;
}

describe('2013 spelling updates', () => {
  for (const entry of changes.spellings) {
    test(entry.was + ' to ' + entry.now, () => {
      const problems = [];
      for (const refText of entry.refs) {
        for (const problem of checkSpelling(verseText(refText), entry)) problems.push(refText + ': ' + problem);
      }
      assert.deepEqual(problems, []);
    });
  }
});

describe('2013 text corrections', () => {
  for (const entry of changes.corrections) {
    test(entry.ref + ': ' + entry.now, () => {
      assert.deepEqual(checkCorrection(verseText(entry.ref), entry), []);
    });
  }
});

test('every reference in the change list parses', () => {
  const refs = [
    ...changes.spellings.flatMap((entry) => entry.refs),
    ...changes.corrections.map((entry) => entry.ref),
    ...changes.skipped.filter((entry) => entry.ref).map((entry) => entry.ref)
  ];
  for (const refText of refs) verseText(refText);
});

test('every skipped entry has a reason', () => {
  for (const entry of changes.skipped) {
    assert.ok(entry.reason, (entry.ref || entry.where) + ' needs a reason');
    assert.ok(entry.ref || entry.where, 'a skipped entry needs a ref or a where');
  }
});

describe('the checks catch an old reading', () => {
  test('a correction reverted in Gen 5:17', () => {
    const entry = changes.corrections.find((item) => item.ref === 'Gen 5:17');
    const oldText = verseText('Gen 5:17').replace(entry.now, entry.was);
    assert.notEqual(oldText, verseText('Gen 5:17'));
    assert.deepEqual(checkCorrection(oldText, entry), [
      'missing "eight hundred ninety and five"',
      'still has "eight hundred and ninety and five"'
    ]);
  });

  test('a spelling reverted in Ruth 1:18', () => {
    const entry = changes.spellings.find((item) => item.was === 'stedfast');
    const oldText = verseText('Ruth 1:18').replace('steadfastly', 'stedfastly');
    assert.notEqual(oldText, verseText('Ruth 1:18'));
    assert.deepEqual(checkSpelling(oldText, entry), ['still has "stedfastly"', 'missing "steadfast"']);
  });

  test('jubilee is not mistaken for the old jubile', () => {
    const entry = changes.spellings.find((item) => item.was === 'jubile');
    assert.deepEqual(checkSpelling(verseText('Lev 25:10'), entry), []);
    assert.deepEqual(checkSpelling('it shall be a jubile unto you', entry), ['still has "jubile"', 'missing "jubilee"']);
  });

  test('vail does not match prevail', () => {
    const entry = changes.spellings.find((item) => item.was === 'vail');
    assert.deepEqual(checkSpelling('the veil shall prevail', entry), []);
  });
});
