import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const ChromaKey = loadModule('ChromaKey');

const GREEN = '#00B140';
const SKIN = '#E0AC69';
const EDGE = '#60A080';

function alphaOf(hex, key) {
  const { r, g, b } = ChromaKey.parseHex(hex);
  return ChromaKey.alphaFor(r, g, b, key);
}

function pixels(...hexes) {
  const data = new Uint8ClampedArray(hexes.length * 4);
  hexes.forEach((hex, i) => {
    const { r, g, b } = ChromaKey.parseHex(hex);
    data.set([r, g, b, 255], i * 4);
  });
  return data;
}

describe('chroma', () => {
  test('pure gray has no color: cb and cr sit at 128', () => {
    const c = ChromaKey.chroma(128, 128, 128);
    assert.ok(Math.abs(c.cb - 128) < 1e-6);
    assert.ok(Math.abs(c.cr - 128) < 1e-6);
    assert.ok(Math.abs(c.y - 128) < 1e-6);
  });
});

describe('prepare', () => {
  test('a colorful key (green) counts brightness only a little', () => {
    assert.equal(ChromaKey.prepare(GREEN, 40).wy, 0.25);
  });

  test('a dull key (white) counts brightness fully', () => {
    assert.equal(ChromaKey.prepare('#FFFFFF', 40).wy, 1);
  });

  test('amount 0 turns the key off', () => {
    assert.equal(ChromaKey.prepare(GREEN, 0).off, true);
    assert.equal(ChromaKey.prepare(GREEN, 40).off, false);
  });
});

describe('alphaFor', () => {
  test('the key color itself becomes fully see-through at amount 40', () => {
    assert.equal(alphaOf(GREEN, ChromaKey.prepare(GREEN, 40)), 0);
  });

  test('a skin tone stays fully solid against a green key', () => {
    assert.equal(alphaOf(SKIN, ChromaKey.prepare(GREEN, 40)), 1);
  });

  test('amount 0 removes nothing, not even the key color', () => {
    assert.equal(alphaOf(GREEN, ChromaKey.prepare(GREEN, 0)), 1);
  });

  test('a color near the key lands in the soft band, partly see-through', () => {
    const a = alphaOf(EDGE, ChromaKey.prepare(GREEN, 40));
    assert.ok(a > 0 && a < 1, 'alpha was ' + a);
  });

  test('a white key removes white but keeps mid-gray, because brightness counts', () => {
    const key = ChromaKey.prepare('#FFFFFF', 40);
    assert.equal(alphaOf('#FFFFFF', key), 0);
    assert.equal(alphaOf('#808080', key), 1);
  });
});

describe('apply', () => {
  test('the key pixel goes clear and the skin pixel stays solid', () => {
    const data = pixels(GREEN, SKIN);
    ChromaKey.apply(data, ChromaKey.prepare(GREEN, 40));
    assert.equal(data[3], 0);
    assert.equal(data[7], 255);
  });

  test('a kept pixel keeps its own transparency', () => {
    const data = pixels(SKIN);
    data[3] = 128;
    ChromaKey.apply(data, ChromaKey.prepare(GREEN, 40));
    assert.equal(data[3], 128);
  });

  test('an edge pixel loses some of its color, so a green fringe turns neutral', () => {
    const data = pixels(EDGE);
    const before = ChromaKey.chroma(data[0], data[1], data[2]);
    ChromaKey.apply(data, ChromaKey.prepare(GREEN, 40));
    const after = ChromaKey.chroma(data[0], data[1], data[2]);
    const sat = (c) => Math.hypot(c.cb - 128, c.cr - 128);
    assert.ok(data[3] > 0 && data[3] < 255, 'alpha was ' + data[3]);
    assert.ok(sat(after) < sat(before), sat(after) + ' is not below ' + sat(before));
  });
});

describe('sample', () => {
  test('averages a 3×3 patch', () => {
    const hexes = ['#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#090909', '#090909', '#090909'];
    const data = pixels(...hexes);
    assert.equal(ChromaKey.sample(data, 3, 3, 1, 1, 1), '#030303');
  });

  test('a patch at the corner is clipped to the buffer', () => {
    const data = pixels('#102030', '#102030', '#102030', '#FFFFFF');
    assert.equal(ChromaKey.sample(data, 2, 2, 0, 0, 1), '#4C5864');
    assert.equal(ChromaKey.sample(data, 2, 2, 0, 0, 0), '#102030');
  });
});
