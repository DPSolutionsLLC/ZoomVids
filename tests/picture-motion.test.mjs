import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const PictureMotion = loadModule('PictureMotion');

const near = (actual, expected, tol = 1e-9) => assert.ok(Math.abs(actual - expected) <= tol, actual + ' is not close to ' + expected);
const deg = (d) => d * Math.PI / 180;

describe('at', () => {
  test('none does not move at any point', () => {
    [0, 0.5, 1].forEach((u) => assert.deepEqual(PictureMotion.at('none', 'medium', u), { scale: 1, dx: 0, dy: 0, rot: 0 }));
  });

  test('slow zoom in grows 8% when subtle and 15% when medium', () => {
    near(PictureMotion.at('zoomIn', 'subtle', 0).scale, 1);
    near(PictureMotion.at('zoomIn', 'subtle', 1).scale, 1.08);
    near(PictureMotion.at('zoomIn', 'medium', 1).scale, 1.15);
  });

  test('slow zoom out is the reverse', () => {
    near(PictureMotion.at('zoomOut', 'subtle', 0).scale, 1.08);
    near(PictureMotion.at('zoomOut', 'subtle', 1).scale, 1);
  });

  test('drift left moves from +0.02 to -0.02 of the box when subtle', () => {
    near(PictureMotion.at('driftLeft', 'subtle', 0).dx, 0.02);
    near(PictureMotion.at('driftLeft', 'subtle', 1).dx, -0.02);
  });

  test('a slight turn goes from -0.75° to +0.75° when subtle', () => {
    near(PictureMotion.at('turn', 'subtle', 0).rot, deg(-0.75));
    near(PictureMotion.at('turn', 'subtle', 1).rot, deg(0.75));
  });

  test('progress below 0 or above 1 is held at the ends', () => {
    assert.deepEqual(PictureMotion.at('zoomIn', 'subtle', -3), PictureMotion.at('zoomIn', 'subtle', 0));
    assert.deepEqual(PictureMotion.at('zoomIn', 'subtle', 7), PictureMotion.at('zoomIn', 'subtle', 1));
  });

  test('an unknown motion or strength falls back to none or subtle', () => {
    assert.deepEqual(PictureMotion.at('spin', 'subtle', 0.5), { scale: 1, dx: 0, dy: 0, rot: 0 });
    assert.deepEqual(PictureMotion.at('zoomIn', 'wild', 1), PictureMotion.at('zoomIn', 'subtle', 1));
  });
});

describe('coverScale', () => {
  test('no motion needs no extra size', () => {
    assert.equal(PictureMotion.coverScale('none', 'subtle', 1920, 1080), 1);
  });

  test('a subtle drift needs 4% extra', () => {
    near(PictureMotion.coverScale('driftLeft', 'subtle', 1920, 1080), 1.04); // 1 + 2 * 0.02
  });

  test('a medium turn on a 16:9 box needs cos + sin × 16/9 of its largest angle', () => {
    const expected = Math.cos(deg(1.5)) + Math.sin(deg(1.5)) * 16 / 9; // ≈ 1.0462
    near(PictureMotion.coverScale('turn', 'medium', 1920, 1080), expected);
    near(expected, 1.0462, 1e-4);
  });
});

test('no edge of the box ever shows, for every motion and strength', () => {
  const W = 1920, H = 1080;
  PictureMotion.PRESETS.forEach((preset) => {
    ['subtle', 'medium'].forEach((strength) => {
      [0, 0.25, 0.5, 0.75, 1].forEach((u) => {
        const m = PictureMotion.transform(preset.id, strength, u, W, H);
        const cos = Math.cos(-m.rot), sin = Math.sin(-m.rot);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
          // a corner of the box, measured from the picture's center, turned back into the picture's frame
          const x = sx * W / 2 - m.dx * W, y = sy * H / 2 - m.dy * H;
          const px = x * cos - y * sin, py = x * sin + y * cos;
          const where = preset.id + ' ' + strength + ' at ' + u;
          assert.ok(Math.abs(px) <= m.scale * W / 2 + 1e-6, where + ': corner shows on the side');
          assert.ok(Math.abs(py) <= m.scale * H / 2 + 1e-6, where + ': corner shows at the top or bottom');
        });
      });
    });
  });
});
