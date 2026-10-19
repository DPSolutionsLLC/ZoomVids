import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const Media = loadModule('Media');

function header(size, type, largeSize) {
  const bytes = new Uint8Array(16);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, size);
  for (let i = 0; i < 4; i++) bytes[4 + i] = type.charCodeAt(i);
  if (largeSize != null) { view.setUint32(8, Math.floor(largeSize / 4294967296)); view.setUint32(12, largeSize % 4294967296); }
  return bytes;
}

describe('boxHeader', () => {
  test('reads a normal 32-bit box', () => {
    assert.deepEqual(Media.boxHeader(header(391487, 'moov'), 0), { type: 'moov', size: 391487, header: 8 });
  });

  test('a size of 1 reads the 64-bit size that follows', () => {
    const big = 6 * 4294967296 + 12345; // a 24 GB mdat
    assert.deepEqual(Media.boxHeader(header(1, 'mdat', big), 0), { type: 'mdat', size: big, header: 16 });
  });

  test('a size of 0 means the box runs to the end of the file', () => {
    assert.equal(Media.boxHeader(header(0, 'mdat'), 0).size, 0);
  });

  test('fewer than 8 bytes gives null', () => {
    assert.equal(Media.boxHeader(new Uint8Array(5), 0), null);
  });

  test('reads from a position inside the bytes', () => {
    const bytes = new Uint8Array(24);
    bytes.set(header(28, 'ftyp'), 8);
    assert.deepEqual(Media.boxHeader(bytes, 8), { type: 'ftyp', size: 28, header: 8 });
  });
});

const samples = [
  { offset: 100, size: 50, ts: 0, key: true },
  { offset: 150, size: 10, ts: 33333, key: false },
  { offset: 160, size: 10, ts: 66667, key: false },
  { offset: 170, size: 40, ts: 100000, key: true },
  { offset: 210, size: 10, ts: 133333, key: false }
];

describe('keyIndexBefore', () => {
  test('picks the last key frame at or before the time', () => {
    assert.equal(Media.keyIndexBefore(samples, 120000), 3);
    assert.equal(Media.keyIndexBefore(samples, 100000), 3);
    assert.equal(Media.keyIndexBefore(samples, 99999), 0);
  });

  test('a time before the first sample gives 0', () => {
    assert.equal(Media.keyIndexBefore(samples, -5), 0);
  });
});

describe('readRuns', () => {
  test('stops before the run grows past maxBytes', () => {
    assert.equal(Media.readRuns(samples, 0, 70, 60), 3); // three samples span 100..170 = 70 bytes; the fourth makes 110
    assert.equal(Media.readRuns(samples, 0, 69, 60), 2); // 70 > 69, so only 100..160 = 60 bytes
    assert.equal(Media.readRuns(samples, 0, 110, 60), 4); // 100..210 is exactly 110
  });

  test('stops at maxCount samples', () => {
    assert.equal(Media.readRuns(samples, 1, 1e6, 2), 3);
  });

  test('always takes at least one sample, even one larger than maxBytes', () => {
    assert.equal(Media.readRuns(samples, 0, 10, 60), 1);
  });

  test('runs to the end of the list', () => {
    assert.equal(Media.readRuns(samples, 2, 1e6, 60), 5);
  });
});
