import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const TextLayout = loadModule('TextLayout');

const measure = (text, px) => text.length * px * 0.5;

function spec(overrides) {
  return Object.assign({
    paragraphs: [{ num: null, text: 'abcd' }],
    ref: null,
    frame: { x: 0, y: 0, w: 400, h: 300 },
    size: 20,
    minSize: 10,
    lh: 1,
    align: 'center',
    valign: 'top',
    refPos: 'bottom'
  }, overrides);
}

describe('legacyFrame', () => {
  test('a centered point with no wrap fills the screen', () => {
    assert.deepEqual(TextLayout.legacyFrame(0.5, 0.5), { x: 0, y: 0, w: 1, h: 1 });
  });

  test('the wrap width narrows the box around the old point', () => {
    assert.deepEqual(TextLayout.legacyFrame(0.5, 0.3, 80), { x: 0.1, y: 0, w: 0.8, h: 0.6 });
  });

  test('a zero wrap means no limit', () => {
    const frame = TextLayout.legacyFrame(0.2, 0.5, 0);
    assert.equal(frame.w, 0.4);
    assert.equal(frame.x, 0);
  });

  test('a point on the top edge still gets the smallest box height', () => {
    const frame = TextLayout.legacyFrame(0.5, 0);
    assert.equal(frame.h, TextLayout.MIN_H);
    assert.equal(frame.y, 0);
  });

  test('a missing point acts as the center', () => {
    assert.deepEqual(TextLayout.legacyFrame(undefined, undefined), TextLayout.legacyFrame(0.5, 0.5));
  });
});

describe('upgradeText', () => {
  test('an old item gains a box, middle alignment, and loses its point and wrap', () => {
    const tx = TextLayout.upgradeText({ id: 'a', text: 'Hi', x: 0.5, y: 0.3, wrap: 80 });
    assert.deepEqual(tx.frame, { x: 0.1, y: 0, w: 0.8, h: 0.6 });
    assert.equal(tx.valign, 'middle');
    assert.ok(!('x' in tx) && !('y' in tx) && !('wrap' in tx));
  });

  test('running it twice changes nothing', () => {
    const once = TextLayout.upgradeText({ id: 'a', text: 'Hi', x: 0.4, y: 0.7, wrap: 60 });
    const copy = JSON.parse(JSON.stringify(once));
    assert.deepEqual(TextLayout.upgradeText(once), copy);
  });

  test('an item that already has a box and no alignment gets top', () => {
    const tx = TextLayout.upgradeText({ id: 'a', text: 'Hi', frame: { x: 0.1, y: 0.1, w: 0.5, h: 0.5 } });
    assert.equal(tx.valign, 'top');
    assert.deepEqual(tx.frame, { x: 0.1, y: 0.1, w: 0.5, h: 0.5 });
  });
});

describe('resizeFrame', () => {
  const f0 = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 };

  test('move shifts both axes', () => {
    assert.deepEqual(TextLayout.resizeFrame(f0, 'move', 0.1, 0.1), { x: 0.3, y: 0.3, w: 0.4, h: 0.4 });
  });

  test('move stays on screen at every edge', () => {
    assert.deepEqual(TextLayout.resizeFrame(f0, 'move', 1, 1), { x: 0.6, y: 0.6, w: 0.4, h: 0.4 });
    assert.deepEqual(TextLayout.resizeFrame(f0, 'move', -1, -1), { x: 0, y: 0, w: 0.4, h: 0.4 });
  });

  test('the right edge changes only the width', () => {
    assert.deepEqual(TextLayout.resizeFrame(f0, 'e', 0.1, 0.3), { x: 0.2, y: 0.2, w: 0.5, h: 0.4 });
  });

  test('the left edge moves x and keeps the right edge fixed', () => {
    const frame = TextLayout.resizeFrame(f0, 'w', 0.1, 0);
    assert.equal(frame.x, 0.3);
    assert.equal(Math.round((frame.x + frame.w) * 1e4) / 1e4, 0.6);
  });

  test('the top edge keeps the bottom edge fixed', () => {
    const frame = TextLayout.resizeFrame(f0, 'n', 0, 0.1);
    assert.equal(frame.y, 0.3);
    assert.equal(Math.round((frame.y + frame.h) * 1e4) / 1e4, 0.6);
  });

  test('a corner changes width and height', () => {
    assert.deepEqual(TextLayout.resizeFrame(f0, 'se', 0.1, 0.1), { x: 0.2, y: 0.2, w: 0.5, h: 0.5 });
  });

  test('dragging past the opposite edge stops at the smallest box', () => {
    assert.equal(TextLayout.resizeFrame(f0, 'e', -1, 0).w, TextLayout.MIN_W);
    assert.equal(TextLayout.resizeFrame(f0, 'n', 0, 1).h, TextLayout.MIN_H);
  });

  test('dragging off screen stops at the screen edge', () => {
    assert.equal(TextLayout.resizeFrame(f0, 'e', 1, 0).w, 0.8);
    assert.deepEqual(TextLayout.resizeFrame(f0, 'nw', -1, -1), { x: 0, y: 0, w: 0.6, h: 0.6 });
  });

  test('the starting box is not changed', () => {
    const before = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 };
    TextLayout.resizeFrame(before, 'se', 0.2, 0.2);
    TextLayout.resizeFrame(before, 'move', 0.2, 0.2);
    assert.deepEqual(before, { x: 0.2, y: 0.2, w: 0.4, h: 0.4 });
  });
});

describe('handleAt', () => {
  const r = { x: 10, y: 10, w: 100, h: 100 };

  test('the four corners', () => {
    assert.equal(TextLayout.handleAt(r, 10, 10, 8), 'nw');
    assert.equal(TextLayout.handleAt(r, 110, 10, 8), 'ne');
    assert.equal(TextLayout.handleAt(r, 10, 110, 8), 'sw');
    assert.equal(TextLayout.handleAt(r, 110, 110, 8), 'se');
  });

  test('the four edge midpoints', () => {
    assert.equal(TextLayout.handleAt(r, 60, 10, 8), 'n');
    assert.equal(TextLayout.handleAt(r, 60, 110, 8), 's');
    assert.equal(TextLayout.handleAt(r, 10, 60, 8), 'w');
    assert.equal(TextLayout.handleAt(r, 110, 60, 8), 'e');
  });

  test('inside the box moves it', () => {
    assert.equal(TextLayout.handleAt(r, 60, 60, 8), 'move');
  });

  test('well outside the box is nothing', () => {
    assert.equal(TextLayout.handleAt(r, 130, 60, 8), null);
  });

  test('a corner wins over an edge', () => {
    assert.equal(TextLayout.handleAt(r, 14, 13, 8), 'nw');
  });
});

describe('paragraphsOf', () => {
  test('plain text keeps empty lines', () => {
    assert.deepEqual(TextLayout.paragraphsOf({ text: 'One\n\nTwo' }), [
      { num: null, text: 'One' }, { num: null, text: '' }, { num: null, text: 'Two' }
    ]);
  });

  test('a passage numbers each verse', () => {
    const tx = { passage: { verses: [{ n: 10, text: 'a' }, { n: 11, text: 'b' }, { n: 12, text: 'c' }] } };
    assert.deepEqual(TextLayout.paragraphsOf(tx).map((p) => p.num), ['10', '11', '12']);
  });

  test('a single verse has no number', () => {
    const tx = { passage: { verses: [{ n: 16, text: 'For God so loved the world' }] } };
    assert.deepEqual(TextLayout.paragraphsOf(tx), [{ num: null, text: 'For God so loved the world' }]);
  });
});

describe('wrapParagraph', () => {
  test('wraps at the width', () => {
    const lines = TextLayout.wrapParagraph({ num: null, text: 'aaa bbb ccc' }, 100, 20, measure);
    assert.deepEqual(lines.map((l) => l.text), ['aaa bbb', 'ccc']);
    assert.equal(lines[0].w, 70);
  });

  test('the verse number takes width on the first line only', () => {
    const plain = TextLayout.wrapParagraph({ num: null, text: 'aaaa bbbb' }, 100, 20, measure);
    assert.equal(plain.length, 1);
    const numbered = TextLayout.wrapParagraph({ num: '10', text: 'aaaa bbbb' }, 100, 20, measure);
    assert.deepEqual(numbered.map((l) => l.text), ['aaaa', 'bbbb']);
    assert.equal(numbered[0].num, '10');
    assert.equal(numbered[0].numW, 15);
    assert.equal(numbered[0].w, 55);
    assert.equal(numbered[1].num, null);
    assert.equal(numbered[1].numW, 0);
    assert.equal(numbered[1].w, 40);
  });

  test('a word longer than the width stays on its own line', () => {
    const lines = TextLayout.wrapParagraph({ num: null, text: 'x aaaaaaaaaaaaaaa y' }, 100, 20, measure);
    assert.deepEqual(lines.map((l) => l.text), ['x', 'aaaaaaaaaaaaaaa', 'y']);
  });

  test('an empty paragraph gives one empty line', () => {
    assert.deepEqual(TextLayout.wrapParagraph({ num: null, text: '' }, 100, 20, measure), [{ num: null, numW: 0, text: '', w: 0 }]);
  });
});

describe('fitSize', () => {
  test('text that fits keeps its size', () => {
    assert.equal(TextLayout.fitSize(spec({ size: 40 }), measure), 40);
  });

  test('text that is too tall shrinks until it fits', () => {
    const paragraphs = Array.from({ length: 10 }, () => ({ num: null, text: 'a' }));
    const px = TextLayout.fitSize(spec({ paragraphs, size: 40 }), measure);
    assert.ok(px < 40);
    assert.ok(px * 10 <= 300);
  });

  test('the reference counts toward the height', () => {
    const paragraphs = Array.from({ length: 7 }, () => ({ num: null, text: 'a' }));
    const without = TextLayout.fitSize(spec({ paragraphs, size: 40 }), measure);
    const withRef = TextLayout.fitSize(spec({ paragraphs, size: 40, ref: 'Luke 3:10' }), measure);
    assert.ok(withRef < without);
  });

  test('never goes below the smallest size', () => {
    const paragraphs = Array.from({ length: 20 }, () => ({ num: null, text: 'a' }));
    assert.ok(TextLayout.fitSize(spec({ paragraphs, size: 40, frame: { x: 0, y: 0, w: 400, h: 300 } }), measure) >= 10);
  });

  test('a box too small for even the smallest size returns exactly that size', () => {
    assert.equal(TextLayout.fitSize(spec({ size: 40, frame: { x: 0, y: 0, w: 400, h: 5 } }), measure), 10);
  });

  test('a long reference wraps instead of shrinking the text to its width', () => {
    const frame = { x: 0, y: 0, w: 100, h: 300 };
    const px = TextLayout.fitSize(spec({ frame, paragraphs: [{ num: null, text: 'ab' }], size: 20, ref: 'aaaa bbbb cccc' }), measure);
    assert.equal(px, 20);
  });

  test('a fixed size never shrinks, even when it cannot fit', () => {
    assert.equal(TextLayout.fitSize(spec({ size: 40, fixed: true, frame: { x: 0, y: 0, w: 400, h: 5 } }), measure), 40);
  });

  test('fixed set to false behaves like shrink-to-fit', () => {
    assert.equal(TextLayout.fitSize(spec({ size: 40, fixed: false }), measure), 40);
    assert.equal(TextLayout.fitSize(spec({ size: 40, fixed: false, frame: { x: 0, y: 0, w: 400, h: 5 } }), measure), 10);
  });
});

describe('fits', () => {
  test('text inside its box fits', () => {
    assert.equal(TextLayout.fits(spec({ size: 20 }), 20, measure), true);
  });

  test('text taller than its box does not fit', () => {
    assert.equal(TextLayout.fits(spec({ frame: { x: 0, y: 0, w: 400, h: 15 } }), 20, measure), false);
  });

  test('one word wider than its box does not fit', () => {
    assert.equal(TextLayout.fits(spec({ paragraphs: [{ num: null, text: 'a'.repeat(50) }] }), 20, measure), false);
  });

  test('the reference counts toward the height', () => {
    const frame = { x: 0, y: 0, w: 400, h: 25 };
    assert.equal(TextLayout.fits(spec({ frame }), 20, measure), true);
    assert.equal(TextLayout.fits(spec({ frame, ref: 'ab' }), 20, measure), false);
  });

  test('a fixed size too big for its box does not fit', () => {
    const tooSmall = spec({ size: 40, fixed: true, frame: { x: 0, y: 0, w: 400, h: 5 } });
    assert.equal(TextLayout.fits(tooSmall, TextLayout.fitSize(tooSmall, measure), measure), false);
  });

  test('shrink-to-fit stuck at the smallest size still does not fit', () => {
    const tooSmall = spec({ size: 40, frame: { x: 0, y: 0, w: 400, h: 5 } });
    const px = TextLayout.fitSize(tooSmall, measure);
    assert.equal(px, 10);
    assert.equal(TextLayout.fits(tooSmall, px, measure), false);
  });
});

describe('place', () => {
  test('top, middle and bottom alignment', () => {
    assert.equal(TextLayout.place(spec({ valign: 'top' }), 20, measure).content.y, 0);
    assert.equal(TextLayout.place(spec({ valign: 'middle' }), 20, measure).content.y, 140);
    assert.equal(TextLayout.place(spec({ valign: 'bottom' }), 20, measure).content.y, 280);
  });

  test('text taller than the box always starts at its top', () => {
    const frame = { x: 0, y: 50, w: 400, h: 10 };
    assert.equal(TextLayout.place(spec({ frame, valign: 'bottom' }), 20, measure).content.y, 50);
    assert.equal(TextLayout.place(spec({ frame, valign: 'middle' }), 20, measure).content.y, 50);
  });

  test('left, centered and right line up against the box', () => {
    assert.equal(TextLayout.place(spec({ align: 'left' }), 20, measure).lines[0].x, 0);
    assert.equal(TextLayout.place(spec({ align: 'center' }), 20, measure).lines[0].x, 180);
    assert.equal(TextLayout.place(spec({ align: 'right' }), 20, measure).lines[0].x, 360);
  });

  test('the content box follows the alignment', () => {
    const right = TextLayout.place(spec({ align: 'right' }), 20, measure).content;
    assert.deepEqual(right, { x: 360, y: 0, w: 40, h: 20 });
  });

  test('the reference goes above the text when placed at the top', () => {
    const layout = TextLayout.place(spec({ ref: 'Ref', refPos: 'top' }), 20, measure);
    assert.ok(layout.ref.lines[0].y < layout.lines[0].y);
  });

  test('the reference goes below the text when placed at the bottom', () => {
    const layout = TextLayout.place(spec({ ref: 'Ref', refPos: 'bottom' }), 20, measure);
    assert.ok(layout.ref.lines[layout.ref.lines.length - 1].y > layout.lines[layout.lines.length - 1].y);
  });

  test('the reference is the same size as the verses', () => {
    assert.equal(TextLayout.place(spec({ ref: 'Ref' }), 20, measure).refPx, 20);
  });

  const narrow = { x: 0, y: 0, w: 100, h: 300 };

  test('a long reference wraps onto more lines', () => {
    const layout = TextLayout.place(spec({ frame: narrow, ref: 'aaaa bbbb cccc' }), 20, measure);
    assert.deepEqual(layout.ref.lines.map((ln) => ln.text), ['aaaa bbbb', 'cccc']);
  });

  test('each reference line follows the alignment', () => {
    const layout = TextLayout.place(spec({ frame: narrow, ref: 'aaaa bbbb cccc', align: 'right' }), 20, measure);
    layout.ref.lines.forEach((ln) => assert.equal(ln.x + ln.w, 100));
  });

  test('a wrapped reference counts toward the height', () => {
    const one = TextLayout.place(spec({ frame: narrow, ref: 'aaaa' }), 20, measure);
    const two = TextLayout.place(spec({ frame: narrow, ref: 'aaaa bbbb cccc' }), 20, measure);
    assert.equal(two.refH - one.refH, 20);
  });

  test('the reference at the top pushes the verses down by its full height', () => {
    const layout = TextLayout.place(spec({ frame: narrow, ref: 'aaaa bbbb cccc', refPos: 'top' }), 20, measure);
    assert.equal(layout.refH, 50);
    assert.equal(layout.lines[0].y, 60);
  });

  test('a fixed text area keeps the reference still for short and long verses', () => {
    const short = TextLayout.place(spec({ ref: 'Ref', valign: 'middle', areaH: 100, paragraphs: [{ num: '1', text: 'ab' }] }), 20, measure);
    const long = TextLayout.place(spec({ ref: 'Ref', valign: 'middle', areaH: 100, paragraphs: [{ num: '2', text: 'aaaaaaaaaa bbbbbbbbbb cccccccccc dddddddddd eeeeeeeeee' }] }), 20, measure);
    assert.ok(long.lines.length > short.lines.length);
    assert.equal(short.ref.lines[0].y, long.ref.lines[0].y);
  });
});

describe('setFrameField', () => {
  const frame = { x: 0.1, y: 0.1, w: 0.8, h: 0.36 };

  test('sets Top and leaves the rest alone', () => {
    // 0.5 + 0.36 = 0.86, which fits on screen
    assert.deepEqual(TextLayout.setFrameField(frame, 'y', 0.5), { x: 0.1, y: 0.5, w: 0.8, h: 0.36 });
  });
  test('keeps the box on screen when Top is too low', () => {
    // 1 - 0.36 = 0.64
    assert.deepEqual(TextLayout.setFrameField(frame, 'y', 0.9), { x: 0.1, y: 0.64, w: 0.8, h: 0.36 });
  });
  test('a wider box moves left only as far as it must', () => {
    // 0.6 + 0.5 = 1.1 runs off screen, so x = 1 - 0.5 = 0.5
    assert.deepEqual(TextLayout.setFrameField({ x: 0.6, y: 0, w: 0.3, h: 0.2 }, 'w', 0.5), { x: 0.5, y: 0, w: 0.5, h: 0.2 });
  });
  test('Width never goes below the smallest box', () => {
    assert.equal(TextLayout.setFrameField(frame, 'w', 0.01).w, TextLayout.MIN_W);
  });
  test('Height never goes above the screen', () => {
    const out = TextLayout.setFrameField(frame, 'h', 2);
    assert.equal(out.h, 1);
    assert.equal(out.y, 0);
  });
  test('a value that is not a number gives back an unchanged copy', () => {
    const out = TextLayout.setFrameField(frame, 'x', NaN);
    assert.deepEqual(out, frame);
    assert.notEqual(out, frame);
  });
  test('the input frame is never changed', () => {
    const before = Object.assign({}, frame);
    TextLayout.setFrameField(frame, 'w', 0.2);
    TextLayout.setFrameField(frame, 'x', 0.5);
    assert.deepEqual(frame, before);
  });
});
