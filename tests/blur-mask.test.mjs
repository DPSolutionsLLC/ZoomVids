import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const BlurMask = loadModule('BlurMask');

describe('radius', () => {
  test('no blur gives 0', () => {
    assert.equal(BlurMask.radius(0, 1080), 0);
  });

  test('full blur on a 1080-high screen is the largest radius', () => {
    assert.equal(BlurMask.radius(100, 1080), BlurMask.MAX_RADIUS);
    assert.equal(BlurMask.radius(100, 1080), 30);
  });

  test('half blur on the 540-high preview is scaled down to match', () => {
    assert.equal(BlurMask.radius(50, 540), 7.5);
  });

  test('a negative amount gives 0', () => {
    assert.equal(BlurMask.radius(-20, 1080), 0);
  });
});

describe('shape', () => {
  test('the ends and the middle', () => {
    assert.equal(BlurMask.shape(0), 0);
    assert.equal(BlurMask.shape(1), 1);
    assert.ok(Math.abs(BlurMask.shape(0.5) - 0.5) < 1e-9);
  });

  test('low confidence is fully background and high is fully person', () => {
    assert.equal(BlurMask.shape(0.3), 0);
    assert.equal(BlurMask.shape(0.7), 1);
  });

  test('it never goes down as confidence goes up', () => {
    let last = -1;
    for (let c = 0; c <= 1.0001; c += 0.01) {
      const s = BlurMask.shape(c);
      assert.ok(s >= last, 'dropped at ' + c);
      last = s;
    }
  });
});

describe('alpha', () => {
  const conf = new Float32Array([0, 0.5, 0.6, 1]);

  test('with no previous frame it is the shaped confidence', () => {
    const out = BlurMask.alpha(conf, null, 0.4);
    assert.ok(out instanceof Uint8ClampedArray);
    assert.deepEqual(Array.from(out), Array.from(conf).map((c) => Math.round(BlurMask.shape(c) * 255)));
  });

  test('a previous frame of the same length is mixed in', () => {
    const prev = new Uint8ClampedArray([255, 0, 100, 0]);
    const out = BlurMask.alpha(conf, prev, 0.4);
    const expected = Array.from(conf).map((c, i) => Math.round(BlurMask.shape(c) * 255 * 0.6 + prev[i] * 0.4));
    assert.deepEqual(Array.from(out), expected);
  });

  test('a previous frame of another length is ignored', () => {
    const prev = new Uint8ClampedArray([255, 255]);
    assert.deepEqual(Array.from(BlurMask.alpha(conf, prev, 0.4)), Array.from(BlurMask.alpha(conf, null, 0.4)));
  });

  test('it returns a new array and leaves the previous one alone', () => {
    const prev = new Uint8ClampedArray([1, 2, 3, 4]);
    const out = BlurMask.alpha(conf, prev, 0.4);
    assert.notEqual(out, prev);
    assert.deepEqual(Array.from(prev), [1, 2, 3, 4]);
  });
});

describe('toRgba', () => {
  test('white pixels carrying the alpha', () => {
    const alpha = new Uint8ClampedArray([0, 128, 255]);
    const out = new Uint8ClampedArray(12);
    assert.equal(BlurMask.toRgba(alpha, out), out);
    assert.deepEqual(Array.from(out), [255, 255, 255, 0, 255, 255, 255, 128, 255, 255, 255, 255]);
  });
});

describe('segmentSize', () => {
  test('a wide frame has its long side cut to 256', () => {
    assert.deepEqual(BlurMask.segmentSize(1920, 1080), { w: 256, h: 144 });
  });

  test('a tall frame too', () => {
    assert.deepEqual(BlurMask.segmentSize(1080, 1920), { w: 144, h: 256 });
  });

  test('a small frame keeps its size', () => {
    assert.deepEqual(BlurMask.segmentSize(100, 50), { w: 100, h: 50 });
  });

  test('a very thin frame keeps its short side at least 16', () => {
    const s = BlurMask.segmentSize(2000, 10);
    assert.equal(s.w, 256);
    assert.ok(s.h >= 16);
  });
});
