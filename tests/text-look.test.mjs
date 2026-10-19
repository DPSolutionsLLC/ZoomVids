import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const TextLook = loadModule('TextLook');

const savedOutline = { look: 'outline', glowColor: '#112233', glowOpacity: 80, glowWidth: 20, glowSoft: 30, boxColor: '#445566', boxOpacity: 50 };

describe('upgrade', () => {
  test('a boxed item becomes Dark box', () => {
    const tx = TextLook.upgrade({ box: true });
    assert.equal(tx.look, 'box');
    assert.equal('box' in tx, false);
  });

  test('an unboxed or bare item becomes Soft shadow', () => {
    assert.equal(TextLook.upgrade({ box: false }).look, 'shadow');
    assert.equal(TextLook.upgrade({}).look, 'shadow');
  });

  test('running it twice gives the same result', () => {
    const once = TextLook.upgrade({ box: true, text: 'hi' });
    const twice = TextLook.upgrade(structuredClone(once));
    assert.deepEqual(twice, once);
  });

  test('leaves a valid look and its fields alone', () => {
    const tx = TextLook.upgrade({ look: 'outline', glowColor: '#FF0000', glowOpacity: 40 });
    assert.deepEqual(tx, { look: 'outline', glowColor: '#FF0000', glowOpacity: 40 });
  });

  test('an invalid look falls back to the legacy box field', () => {
    assert.equal(TextLook.upgrade({ look: 'glow', box: true }).look, 'box');
  });
});

describe('resolve', () => {
  test('fills defaults for a bare item', () => {
    assert.deepEqual(TextLook.resolve({}), TextLook.DEFAULTS);
    assert.equal(TextLook.resolve({}).look, 'shadow');
  });

  test('reads legacy box without changing the input', () => {
    const tx = { box: true, text: 'hi' };
    const before = structuredClone(tx);
    assert.equal(TextLook.resolve(tx).look, 'box');
    assert.deepEqual(tx, before);
  });

  test('clamps numbers to their ranges', () => {
    const lk = TextLook.resolve({ look: 'outline', glowOpacity: 150, glowWidth: -3, glowSoft: 99 });
    assert.equal(lk.glowOpacity, 100);
    assert.equal(lk.glowWidth, 0);
    assert.equal(lk.glowSoft, 60);
  });

  test('ignores a color that is not a six-digit hex', () => {
    const lk = TextLook.resolve({ look: 'outline', glowColor: 'red' });
    assert.equal(lk.look, 'outline');
    assert.equal(lk.glowColor, TextLook.DEFAULTS.glowColor);
  });
});

describe('pick', () => {
  test('returns only the look fields', () => {
    const picked = TextLook.pick(Object.assign({ text: 'hi', frame: { x: 0, y: 0, w: 1, h: 1 } }, savedOutline));
    assert.deepEqual(Object.keys(picked).sort(), [...TextLook.FIELDS].sort());
    assert.deepEqual(picked, savedOutline);
  });
});

describe('apply', () => {
  test('with nothing saved, starts as Soft shadow and nothing else', () => {
    const tx = TextLook.apply({ id: 'a', box: false }, null);
    assert.deepEqual(tx, { id: 'a', look: 'shadow' });
  });

  test('copies every field of a saved outline look', () => {
    const tx = TextLook.apply({ id: 'a' }, savedOutline);
    assert.deepEqual(tx, Object.assign({ id: 'a' }, savedOutline));
  });

  test('skips a field that fails its check', () => {
    const tx = TextLook.apply({ id: 'a' }, { look: 'outline', glowOpacity: 'x' });
    assert.equal(tx.look, 'outline');
    assert.equal('glowOpacity' in tx, false);
  });

  test('a saved value with no valid look starts as Soft shadow', () => {
    const tx = TextLook.apply({ id: 'a' }, { look: 'glow', glowOpacity: 50 });
    assert.deepEqual(tx, { id: 'a', look: 'shadow' });
  });
});

describe('rgba', () => {
  test('matches the old dark box color', () => {
    assert.equal(TextLook.rgba('#0A100D', 72), 'rgba(10,16,13,0.72)');
  });

  test('handles zero opacity', () => {
    assert.equal(TextLook.rgba('#FFFFFF', 0), 'rgba(255,255,255,0)');
  });

  test('falls back to black for an invalid color', () => {
    assert.equal(TextLook.rgba('nope', 50), 'rgba(0,0,0,0.5)');
  });

  test('clamps opacity above 100', () => {
    assert.equal(TextLook.rgba('#000000', 130), 'rgba(0,0,0,1)');
  });
});
