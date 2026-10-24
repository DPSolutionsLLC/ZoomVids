import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const BgColor = loadModule('BgColor');

test('cleanHex lowercases a six-digit color', () => {
  assert.equal(BgColor.cleanHex('#ABCDEF'), '#abcdef');
});

test('cleanHex expands a three-digit color', () => {
  assert.equal(BgColor.cleanHex('#abc'), '#aabbcc');
  assert.equal(BgColor.cleanHex('#ABC'), '#aabbcc');
});

test('cleanHex gives null, never an empty string, for bad input', () => {
  for (const value of ['abcdef', '', 'red', '#abcdef00', '#12345', null, undefined, 42]) {
    assert.equal(BgColor.cleanHex(value), null);
  }
});

test('cleanOpts upgrades an old dark background to today\'s fade', () => {
  const out = BgColor.cleanOpts({ bg: 'dark' });
  assert.equal(out.bg, 'color');
  assert.equal(out.bgStyle, 'fade');
  assert.equal(out.bgTop, '#16231d');
  assert.equal(out.bgBottom, '#0b110e');
});

test('cleanOpts keeps a valid style and colors', () => {
  const out = BgColor.cleanOpts({ bg: 'color', bgStyle: 'flat', bgTop: '#14213D', bgBottom: '#000000' });
  assert.equal(out.bgStyle, 'flat');
  assert.equal(out.bgTop, '#14213d');
  assert.equal(out.bgBottom, '#000000');
});

test('cleanOpts turns a bad style into fade', () => {
  assert.equal(BgColor.cleanOpts({ bgStyle: 'stripes' }).bgStyle, 'fade');
});

test('cleanOpts replaces a bad color with the default, never empty or null', () => {
  const out = BgColor.cleanOpts({ bgTop: 'red', bgBottom: '' });
  assert.equal(out.bgTop, BgColor.DEFAULT_TOP);
  assert.equal(out.bgBottom, BgColor.DEFAULT_BOTTOM);
});

test('cleanOpts keeps the other background kinds', () => {
  assert.equal(BgColor.cleanOpts({ bg: 'green' }).bg, 'green');
  assert.equal(BgColor.cleanOpts({ bg: 'motion' }).bg, 'motion');
});

test('cleanOpts copies other keys unchanged', () => {
  const out = BgColor.cleanOpts({ bg: 'dark', textScale: 120, capPos: 'right' });
  assert.equal(out.textScale, 120);
  assert.equal(out.capPos, 'right');
});

test('cleanOpts does not change its input', () => {
  const opts = { bg: 'dark', bgTop: 'bad', textScale: 100 };
  const copy = structuredClone(opts);
  BgColor.cleanOpts(opts);
  assert.deepEqual(opts, copy);
});

test('stops gives one color for flat', () => {
  const st = BgColor.stops({ bgStyle: 'flat', bgTop: '#14213d', bgBottom: '#000000' });
  assert.deepEqual(st, { top: '#14213d', bottom: '#14213d' });
});

test('stops gives two colors for fade', () => {
  const st = BgColor.stops({ bgStyle: 'fade', bgTop: '#14213d', bgBottom: '#000000' });
  assert.deepEqual(st, { top: '#14213d', bottom: '#000000' });
});

test('stops falls back to the defaults for bad input', () => {
  assert.deepEqual(BgColor.stops({ bgTop: 'nope', bgBottom: 7 }), { top: '#16231d', bottom: '#0b110e' });
  assert.deepEqual(BgColor.stops(null), { top: '#16231d', bottom: '#0b110e' });
});

test('readRecent gives an empty list for non-arrays', () => {
  for (const raw of [null, undefined, {}, '#000000', 5]) {
    assert.deepEqual(BgColor.readRecent(raw), []);
  }
});

test('readRecent drops bad entries', () => {
  assert.deepEqual(BgColor.readRecent(['#000000', 'red', 3, '#ABC']), ['#000000', '#aabbcc']);
});

test('readRecent removes duplicates and keeps the first', () => {
  assert.deepEqual(BgColor.readRecent(['#14213d', '#000000', '#14213D']), ['#14213d', '#000000']);
});

test('readRecent trims to 8', () => {
  const many = ['#000001', '#000002', '#000003', '#000004', '#000005', '#000006', '#000007', '#000008', '#000009'];
  assert.deepEqual(BgColor.readRecent(many), many.slice(0, 8));
});

test('addRecent puts the new color first', () => {
  assert.deepEqual(BgColor.addRecent(['#000000'], '#14213D'), ['#14213d', '#000000']);
});

test('addRecent moves an existing color to the front with no duplicate', () => {
  assert.deepEqual(BgColor.addRecent(['#000000', '#14213d', '#2b2d31'], '#14213d'), ['#14213d', '#000000', '#2b2d31']);
});

test('addRecent drops the oldest when a 9th color is added', () => {
  const eight = ['#000001', '#000002', '#000003', '#000004', '#000005', '#000006', '#000007', '#000008'];
  const out = BgColor.addRecent(eight, '#000009');
  assert.equal(out.length, 8);
  assert.equal(out[0], '#000009');
  assert.equal(out.includes('#000008'), false);
});

test('addRecent ignores a string that is not a valid color', () => {
  assert.deepEqual(BgColor.addRecent(['#000000'], '#12345'), ['#000000']);
});

test('addRecent does not change its input', () => {
  const list = ['#000000', '#14213d'];
  const copy = structuredClone(list);
  BgColor.addRecent(list, '#2b2d31');
  assert.deepEqual(list, copy);
});

test('SWATCHES has 8 clean, different colors, starting with the default', () => {
  assert.equal(BgColor.SWATCHES.length, 8);
  const hexes = BgColor.SWATCHES.map((s) => s.hex);
  for (const hex of hexes) assert.equal(BgColor.cleanHex(hex), hex);
  assert.equal(new Set(hexes).size, 8);
  assert.equal(hexes[0], BgColor.DEFAULT_TOP);
  for (const s of BgColor.SWATCHES) assert.ok(s.name.length > 0);
});
