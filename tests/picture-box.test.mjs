import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const PictureBox = loadModule('PictureBox');

const near = (actual, expected, tol = 1e-9) => assert.ok(Math.abs(actual - expected) <= tol, actual + ' is not close to ' + expected);

describe('fileKind', () => {
  test('pictures are images, whatever the case of the extension', () => {
    ['a.jpg', 'b.JPEG', 'c.png', 'd.webp'].forEach((name) => assert.equal(PictureBox.fileKind(name), 'image'));
  });

  test('mp4, mov, m4v and webm are videos', () => {
    ['a.mp4', 'b.MOV', 'c.m4v', 'd.webm'].forEach((name) => assert.equal(PictureBox.fileKind(name), 'video'));
  });

  test('mp3 and wav are audio', () => {
    assert.equal(PictureBox.fileKind('hymn.mp3'), 'audio');
    assert.equal(PictureBox.fileKind('hymn.wav'), 'audio');
  });

  test('other files and names with no extension are not media', () => {
    assert.equal(PictureBox.fileKind('notes.txt'), null);
    assert.equal(PictureBox.fileKind('README'), null);
    assert.equal(PictureBox.isMedia('notes.txt'), false);
    assert.equal(PictureBox.isMedia('talk.mp4'), true);
  });
});

describe('defaults', () => {
  test('an image fills the screen with no corners or shadow', () => {
    assert.deepEqual(PictureBox.defaults('image'), { frame: { x: 0, y: 0, w: 1, h: 1 }, fit: 'cover', round: false, shadow: false, fadeIn: 1.5, fadeOut: 1.5 });
  });

  test('a video sits in a lower-right window with corners and a shadow', () => {
    assert.deepEqual(PictureBox.defaults('video'), { frame: { x: 0.6, y: 0.6, w: 0.36, h: 0.36 }, fit: 'cover', round: true, shadow: true, fadeIn: 1, fadeOut: 1, show: true });
  });

  test('every call gives a fresh copy', () => {
    const first = PictureBox.defaults('video');
    first.frame.x = 0.1;
    first.round = false;
    assert.equal(PictureBox.defaults('video').frame.x, 0.6);
    assert.equal(PictureBox.defaults('video').round, true);
    assert.equal(PictureBox.PRESETS.lowerRight.x, 0.6);
  });
});

describe('applyPreset', () => {
  test('full screen turns rounded corners and shadow off', () => {
    const out = PictureBox.applyPreset(PictureBox.defaults('video'), 'full');
    assert.deepEqual(out.frame, { x: 0, y: 0, w: 1, h: 1 });
    assert.equal(out.round, false);
    assert.equal(out.shadow, false);
  });

  test('a window preset turns them on', () => {
    const out = PictureBox.applyPreset(PictureBox.defaults('image'), 'lowerRight');
    assert.deepEqual(out.frame, { x: 0.6, y: 0.6, w: 0.36, h: 0.36 });
    assert.equal(out.round, true);
    assert.equal(out.shadow, true);
  });

  test('an unknown name gives back an unchanged copy', () => {
    const pic = PictureBox.defaults('video');
    const out = PictureBox.applyPreset(pic, 'sideways');
    assert.deepEqual(out, pic);
    assert.notEqual(out, pic);
  });

  test('the input is never changed', () => {
    const pic = PictureBox.defaults('video');
    const before = JSON.stringify(pic);
    PictureBox.applyPreset(pic, 'full');
    assert.equal(JSON.stringify(pic), before);
  });
});

describe('clean', () => {
  test('fills every missing field from the defaults', () => {
    assert.deepEqual(PictureBox.clean(undefined, 'image'), PictureBox.defaults('image'));
    assert.deepEqual(PictureBox.clean({}, 'video'), PictureBox.defaults('video'));
  });

  test('moves a box that runs off the right edge back on screen', () => {
    const out = PictureBox.clean({ frame: { x: 0.9, y: 0.1, w: 0.36, h: 0.36 }, fit: 'contain' }, 'image');
    assert.deepEqual(out.frame, { x: 0.64, y: 0.1, w: 0.36, h: 0.36 }); // 1 - 0.36 = 0.64
    assert.equal(out.fit, 'contain');
  });

  test('keeps fit to cover or contain', () => {
    assert.equal(PictureBox.clean({ fit: 'stretch' }, 'image').fit, 'cover');
    assert.equal(PictureBox.clean({ fit: 'contain' }, 'image').fit, 'contain');
  });

  test('clamps fades to 0–10 seconds', () => {
    const out = PictureBox.clean({ fadeIn: -2, fadeOut: 40 }, 'image');
    assert.equal(out.fadeIn, 0);
    assert.equal(out.fadeOut, 10);
  });

  test('turns round and shadow into true or false', () => {
    const out = PictureBox.clean({ round: 1, shadow: 0 }, 'image');
    assert.equal(out.round, true);
    assert.equal(out.shadow, false);
  });

  test('keeps a video’s picture turned off', () => {
    assert.equal(PictureBox.clean({ show: false }, 'video').show, false);
    assert.equal(PictureBox.clean({}, 'video').show, true);
    assert.equal('show' in PictureBox.clean({ show: false }, 'image'), false);
  });

  test('running it twice gives the same result', () => {
    const once = PictureBox.clean({ frame: { x: 0.95, y: -0.3, w: 0.36005, h: 2 }, fit: 'cover', fadeIn: 3.3 }, 'video');
    assert.deepEqual(PictureBox.clean(once, 'video'), once);
  });
});

describe('cleanItem', () => {
  const valid = { id: 'p1', key: 'Photo.jpg|10', name: 'Photo', start: 4, dur: 8, motion: 'driftLeft', strength: 'medium', pic: PictureBox.defaults('image') };

  test('fills a bare item with an 8 s slow zoom in, subtle', () => {
    const out = PictureBox.cleanItem({ id: 'p1', key: 'Photo.jpg|10', name: 'Photo' });
    assert.equal(out.start, 0);
    assert.equal(out.dur, 8);
    assert.equal(out.motion, 'zoomIn');
    assert.equal(out.strength, 'subtle');
    assert.deepEqual(out.pic, PictureBox.defaults('image'));
  });

  test('keeps a valid item as it is', () => {
    assert.deepEqual(PictureBox.cleanItem(valid), valid);
  });

  test('an unknown motion becomes the slow zoom in', () => {
    assert.equal(PictureBox.cleanItem({ ...valid, motion: 'spin' }).motion, 'zoomIn');
  });

  test('a length under half a second becomes half a second', () => {
    assert.equal(PictureBox.cleanItem({ ...valid, dur: 0.1 }).dur, 0.5);
  });

  test('running it twice gives the same result', () => {
    const once = PictureBox.cleanItem({ ...valid, start: -3, dur: 9000, strength: 'loud' });
    assert.deepEqual(PictureBox.cleanItem(once), once);
  });
});

describe('shapeFrame', () => {
  test('a 4:3 picture in a 0.36-wide box gets a 0.48-high box', () => {
    const out = PictureBox.shapeFrame({ x: 0.6, y: 0.5, w: 0.36, h: 0.36 }, 4000, 3000);
    assert.equal(out.w, 0.36);
    near(out.h, 0.48, 1e-4); // 0.36 * 0.75 * 16/9 = 0.48
    near(out.y + out.h / 2, 0.68, 1e-4); // the center stays at 0.5 + 0.18 = 0.68
  });

  test('a tall 9:16 picture in a full-width box shrinks to the screen height', () => {
    const out = PictureBox.shapeFrame({ x: 0, y: 0, w: 1, h: 1 }, 1080, 1920);
    assert.equal(out.h, 1);
    near(out.w, 0.3164, 1e-4); // 1 / (16/9 * 16/9) = 0.3164
    near(out.x + out.w / 2, 0.5, 1e-4);
  });

  test('a size that is not a positive number gives an unchanged copy', () => {
    const frame = { x: 0.1, y: 0.2, w: 0.3, h: 0.4 };
    assert.deepEqual(PictureBox.shapeFrame(frame, 0, 100), frame);
    assert.deepEqual(PictureBox.shapeFrame(frame, 100, -1), frame);
    assert.deepEqual(PictureBox.shapeFrame(frame, undefined, 100), frame);
  });
});

describe('fitRect', () => {
  const box = { x: 0, y: 0, w: 100, h: 100 };

  test('cover crops a wide picture from the middle', () => {
    const r = PictureBox.fitRect(box, 2000, 1000, 'cover');
    assert.equal(r.sw, 1000);
    assert.equal(r.sx, 500); // (2000 - 1000) / 2
    assert.equal(r.sh, 1000);
    assert.deepEqual([r.dx, r.dy, r.dw, r.dh], [0, 0, 100, 100]);
  });

  test('contain shows the whole picture centered in the box', () => {
    const r = PictureBox.fitRect(box, 2000, 1000, 'contain');
    assert.equal(r.dw, 100);
    assert.equal(r.dh, 50);
    assert.equal(r.dy, 25); // (100 - 50) / 2
    assert.deepEqual([r.sx, r.sy, r.sw, r.sh], [0, 0, 2000, 1000]);
  });
});

describe('alphaRaw', () => {
  test('is 0 at both ends, 1 in the middle and 0 outside', () => {
    assert.equal(PictureBox.alphaRaw(0, 0, 8, 1.5, 1.5), 0);
    assert.equal(PictureBox.alphaRaw(4, 0, 8, 1.5, 1.5), 1);
    assert.equal(PictureBox.alphaRaw(8, 0, 8, 1.5, 1.5), 0);
    assert.equal(PictureBox.alphaRaw(-1, 0, 8, 1.5, 1.5), 0);
    assert.equal(PictureBox.alphaRaw(9, 0, 8, 1.5, 1.5), 0);
  });

  test('fades longer than half the time are cut to half', () => {
    // 4 s fades on a 4 s picture become 2 s each, so the middle reaches 1
    assert.equal(PictureBox.alphaRaw(2, 0, 4, 4, 4), 1);
    assert.equal(PictureBox.alphaRaw(1, 0, 4, 4, 4), 0.5); // halfway through a 2 s fade, smoothstep(0.5) = 0.5
  });
});

describe('alphas', () => {
  const full = { x: 0, y: 0, w: 1, h: 1 };
  const a = { id: 'a', start: 0, dur: 8, fadeIn: 1.5, fadeOut: 1.5, frame: full };

  test('a full-screen picture stays solid while the next one fades in over it', () => {
    const b = { id: 'b', start: 6.5, dur: 8, fadeIn: 1.5, fadeOut: 1.5, frame: full };
    const out = PictureBox.alphas([a, b], 7.25);
    assert.equal(out.a, 1);
    assert.ok(out.b > 0 && out.b < 1);
  });

  test('a window that does not cover the picture under it lets it fade normally', () => {
    const b = { id: 'b', start: 6.5, dur: 8, fadeIn: 1.5, fadeOut: 1.5, frame: { x: 0.6, y: 0.6, w: 0.36, h: 0.36 } };
    const out = PictureBox.alphas([a, b], 7.25);
    assert.ok(out.a < 1);
  });
});

describe('order', () => {
  test('sorts by start and keeps the given order for ties', () => {
    const out = PictureBox.order([{ id: 'v', start: 5 }, { id: 'i1', start: 2 }, { id: 'i2', start: 5 }]);
    assert.deepEqual(out.map((l) => l.id), ['i1', 'v', 'i2']);
  });
});

describe('rows', () => {
  test('pictures that don’t overlap share one row', () => {
    assert.deepEqual(PictureBox.rows([{ id: 'a', start: 0, end: 5 }, { id: 'b', start: 5, end: 9 }]), { rowOf: { a: 0, b: 0 }, count: 1 });
  });

  test('two overlapping pictures take two rows', () => {
    assert.equal(PictureBox.rows([{ id: 'a', start: 0, end: 5 }, { id: 'b', start: 3, end: 8 }]).count, 2);
  });

  test('a third picture after the first ends goes back to row 0', () => {
    const out = PictureBox.rows([{ id: 'a', start: 0, end: 5 }, { id: 'b', start: 3, end: 8 }, { id: 'c', start: 6, end: 10 }]);
    assert.deepEqual(out.rowOf, { a: 0, b: 1, c: 0 });
  });

  test('no pictures means no rows', () => {
    assert.deepEqual(PictureBox.rows([]), { rowOf: {}, count: 0 });
  });
});

describe('placeAt', () => {
  test('with no pictures it goes at the playhead', () => {
    assert.equal(PictureBox.placeAt([], 3.33, 1.5), 3.3);
  });

  test('inside a picture it starts as that one fades out', () => {
    assert.equal(PictureBox.placeAt([{ id: 'a', start: 0, end: 8 }], 3, 1.5), 6.5); // 8 - 1.5
  });

  test('pictures already chained push it past the last of them', () => {
    const spans = [{ id: 'a', start: 0, end: 8 }, { id: 'b', start: 6.5, end: 14.5 }];
    assert.equal(PictureBox.placeAt(spans, 1, 1.5), 13); // 14.5 - 1.5
  });

  test('a playhead before 0:00 counts as 0:00', () => {
    assert.equal(PictureBox.placeAt([], -4, 1.5), 0);
  });
});
