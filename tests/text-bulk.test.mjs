import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const TextBulk = loadModule('TextBulk');

const LOOK = { look: 'shadow', glowColor: '#000000', glowOpacity: 60, glowWidth: 12, glowSoft: 20, boxColor: '#0A100D', boxOpacity: 72 };
const lk = (overrides) => Object.assign({}, LOOK, overrides);
const base = (overrides) => Object.assign({ font: 'sans', size: 72, color: '#FFFFFF' }, overrides);

describe('common', () => {
  test('same numbers are not mixed', () => {
    assert.deepEqual(TextBulk.common([1, 1]), { mixed: false, value: 1 });
  });
  test('different numbers are mixed', () => {
    assert.equal(TextBulk.common([1, 2]).mixed, true);
  });
  test('undefined and false both count as off', () => {
    assert.equal(TextBulk.common([undefined, false]).mixed, false);
  });
  test('colors match whatever their case', () => {
    assert.equal(TextBulk.common(['#ffffff', '#FFFFFF']).mixed, false);
  });
  test('an empty list is not mixed and has no value', () => {
    assert.deepEqual(TextBulk.common([]), { mixed: false, value: null });
  });
});

describe('hold', () => {
  test('locked wins over whole', () => {
    assert.equal(TextBulk.hold({ locked: true, whole: true }), 'locked');
  });
  test('whole', () => {
    assert.equal(TextBulk.hold({ whole: true }), 'whole');
  });
  test('tied to a recording', () => {
    assert.equal(TextBulk.hold({ during: 'items:a' }), 'tied');
  });
  test('starting at 0:00 is not held', () => {
    assert.equal(TextBulk.hold({ fromStart: true }), '');
  });
});

describe('targets', () => {
  const five = [
    { id: 'a', locked: true },
    { id: 'b' },
    { id: 'c', whole: true },
    { id: 'd', during: 'items:x' },
    { id: 'e' },
  ];

  test('a timing change skips locked, whole and tied items, in item order', () => {
    assert.deepEqual(TextBulk.targets(five, 'fadeIn', 2), { ids: ['b', 'e'], held: ['locked', 'whole', 'tied'] });
  });
  test('a look change reaches every item, locked ones too', () => {
    assert.deepEqual(TextBulk.targets(five, 'color', '#FF0000'), { ids: ['a', 'b', 'c', 'd', 'e'], held: [] });
  });
  test('Lock and Whole video reach every item', () => {
    assert.deepEqual(TextBulk.targets(five, 'locked', false).ids, ['a', 'b', 'c', 'd', 'e']);
    assert.deepEqual(TextBulk.targets(five, 'whole', true).ids, ['a', 'b', 'c', 'd', 'e']);
  });
  test('Shows for skips an item whose reading time decides its length', () => {
    assert.deepEqual(TextBulk.targets([{ id: 'a', readTime: true }], 'dur', 5), { ids: [], held: ['clash'] });
    assert.deepEqual(TextBulk.targets([{ id: 'a' }], 'dur', 5), { ids: ['a'], held: [] });
  });
  test('Crossfade with the previous needs Start after the previous', () => {
    assert.deepEqual(TextBulk.targets([{ id: 'a', afterPrev: false }], 'xfIn', true).held, ['clash']);
  });
  test('turning reading time on clashes when something else decides the end, turning it off does not', () => {
    assert.deepEqual(TextBulk.targets([{ id: 'a', untilNext: true }], 'readTime', true).held, ['clash']);
    assert.deepEqual(TextBulk.targets([{ id: 'a', untilNext: true, readTime: true }], 'readTime', false).ids, ['a']);
  });
});

describe('heldNote', () => {
  test('one held', () => {
    assert.equal(TextBulk.heldNote(4, ['locked']), 'Changed 4. 1 stayed as it was: 1 locked.');
  });
  test('several held, counted by kind', () => {
    assert.equal(TextBulk.heldNote(2, ['locked', 'tied', 'locked']), 'Changed 2. 3 stayed as they were: 2 locked, 1 tied to a recording.');
  });
  test('nothing changed', () => {
    assert.equal(TextBulk.heldNote(0, ['whole']), 'Nothing changed: 1 shows for the whole video.');
  });
  test('no note when nothing was held', () => {
    assert.equal(TextBulk.heldNote(3, []), '');
  });
});

describe('mixedKinds', () => {
  test('a scripture and plain text are mixed', () => {
    assert.equal(TextBulk.mixedKinds([{ passage: {} }, {}]), true);
  });
  test('only scriptures are not mixed', () => {
    assert.equal(TextBulk.mixedKinds([{ passage: {} }]), false);
  });
});

describe('quick', () => {
  const texts = [{ id: 'a', passage: {} }, { id: 'b', hidden: true }, { id: 'c' }];

  test('each set', () => {
    assert.deepEqual(TextBulk.quick(texts, 'scripture'), ['a']);
    assert.deepEqual(TextBulk.quick(texts, 'own'), ['b', 'c']);
    assert.deepEqual(TextBulk.quick(texts, 'hidden'), ['b']);
    assert.deepEqual(TextBulk.quick(texts, 'showing'), ['a', 'c']);
  });
  test('the input is not changed', () => {
    const before = JSON.parse(JSON.stringify(texts));
    TextBulk.quick(texts, 'own');
    assert.deepEqual(texts, before);
  });
});

describe('lookKey', () => {
  test('position, timing, alignment and line spacing are ignored', () => {
    const a = base({ frame: { x: 0, y: 0, w: 1, h: 1 }, start: 0, align: 'left', lh: 1 });
    const b = base({ frame: { x: 0.2, y: 0.3, w: 0.5, h: 0.5 }, start: 30, align: 'center', lh: 2 });
    assert.equal(TextBulk.lookKey(a, lk()), TextBulk.lookKey(b, lk()));
  });
  test('a different font does not match', () => {
    assert.notEqual(TextBulk.lookKey(base(), lk()), TextBulk.lookKey(base({ font: 'serif' }), lk()));
  });
  test('leftover glow settings on a shadow look are ignored', () => {
    assert.equal(TextBulk.lookKey(base(), lk()), TextBulk.lookKey(base(), lk({ glowColor: '#FF0000' })));
  });
  test('two outlines with different widths do not match', () => {
    assert.notEqual(TextBulk.lookKey(base(), lk({ look: 'outline' })), TextBulk.lookKey(base(), lk({ look: 'outline', glowWidth: 30 })));
  });
  test('text colors match whatever their case', () => {
    assert.equal(TextBulk.lookKey(base({ color: '#ffffff' }), lk()), TextBulk.lookKey(base({ color: '#FFFFFF' }), lk()));
  });
});
