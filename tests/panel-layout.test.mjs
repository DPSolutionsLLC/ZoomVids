import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const PanelLayout = loadModule('PanelLayout');
const view = { w: 1200, h: 800 };
const limits = { minW: 280, maxW: Infinity };

test('constants match the plan', () => {
  assert.equal(PanelLayout.KEY, 'hp.layout');
  assert.equal(PanelLayout.MIN_W, 280);
  assert.equal(PanelLayout.MIN_H, 120);
  assert.equal(PanelLayout.MARGIN, 8);
  assert.equal(PanelLayout.SNAP, 12);
  assert.deepEqual(PanelLayout.IDS, ['timeline', 'preview', 'library', 'order', 'spoken', 'screen', 'texts', 'pictures', 'titles', 'talkref', 'scriptures', 'settings', 'export']);
});

test('clean gives an empty layout for missing or non-object input', () => {
  for (const raw of [null, undefined, 'x', 5, true]) {
    assert.deepEqual(PanelLayout.clean(raw), { panels: {}, order: [] });
  }
});

test('clean keeps a valid entry', () => {
  const out = PanelLayout.clean({ panels: { timeline: { on: true, x: 10, y: 20, w: 500, h: 300 } }, order: ['timeline'] });
  assert.deepEqual(out, { panels: { timeline: { on: true, x: 10, y: 20, w: 500, h: 300 } }, order: ['timeline'] });
});

test('clean drops unknown ids', () => {
  const out = PanelLayout.clean({ panels: { nope: { on: true, x: 10, y: 20, w: 500, h: null }, library: { on: true, x: 10, y: 20, w: 500, h: null } } });
  assert.deepEqual(Object.keys(out.panels), ['library']);
});

test('clean does not coerce string numbers', () => {
  for (const field of ['x', 'y', 'w']) {
    const entry = { on: true, x: 10, y: 20, w: 500, h: null };
    entry[field] = String(entry[field]);
    assert.deepEqual(PanelLayout.clean({ panels: { order: entry } }).panels, {}, field);
  }
});

test('clean drops NaN and Infinity', () => {
  for (const bad of [NaN, Infinity, -Infinity]) {
    assert.deepEqual(PanelLayout.clean({ panels: { order: { on: true, x: bad, y: 20, w: 500, h: null } } }).panels, {});
    assert.deepEqual(PanelLayout.clean({ panels: { order: { on: true, x: 10, y: 20, w: bad, h: null } } }).panels, {});
  }
});

test('clean drops a zero or negative width', () => {
  assert.deepEqual(PanelLayout.clean({ panels: { order: { on: true, x: 10, y: 20, w: 0, h: null } } }).panels, {});
  assert.deepEqual(PanelLayout.clean({ panels: { order: { on: true, x: 10, y: 20, w: -5, h: null } } }).panels, {});
});

test('clean turns an invalid height into null and keeps the rest', () => {
  for (const bad of ['300', NaN, 0, -10, undefined]) {
    const out = PanelLayout.clean({ panels: { order: { on: true, x: 10, y: 20, w: 500, h: bad } } });
    assert.deepEqual(out.panels.order, { on: true, x: 10, y: 20, w: 500, h: null });
  }
});

test('clean sets on only for exactly true', () => {
  for (const on of ['true', 1, null, undefined]) {
    assert.equal(PanelLayout.clean({ panels: { order: { on, x: 10, y: 20, w: 500, h: null } } }).panels.order.on, false);
  }
});

test('clean rounds values', () => {
  const out = PanelLayout.clean({ panels: { order: { on: true, x: 10.4, y: 20.6, w: 500.5, h: 300.2 } } });
  assert.deepEqual(out.panels.order, { on: true, x: 10, y: 21, w: 501, h: 300 });
});

test('clean keeps only known ids in order, without duplicates', () => {
  const out = PanelLayout.clean({ panels: {}, order: ['library', 'nope', 'timeline', 'library', 3] });
  assert.deepEqual(out.order, ['library', 'timeline']);
});

test('clean does not change its input', () => {
  const raw = { panels: { order: { on: true, x: 10.4, y: 20, w: 500, h: 'x' } }, order: ['order', 'order'] };
  const copy = JSON.parse(JSON.stringify(raw));
  PanelLayout.clean(raw);
  assert.deepEqual(raw, copy);
});

test('fromLegacyFloat turns a valid hp.float into an entry with no height', () => {
  assert.deepEqual(PanelLayout.fromLegacyFloat({ on: true, x: 100, y: 200, w: 420 }), { on: true, x: 100, y: 200, w: 420, h: null });
});

test('fromLegacyFloat gives null when a field is missing or invalid', () => {
  for (const field of ['x', 'y', 'w']) {
    const raw = { on: true, x: 100, y: 200, w: 420 };
    delete raw[field];
    assert.equal(PanelLayout.fromLegacyFloat(raw), null, field);
  }
  assert.equal(PanelLayout.fromLegacyFloat({ on: true, x: '100', y: 200, w: 420 }), null);
  assert.equal(PanelLayout.fromLegacyFloat(null), null);
});

test('fit shrinks a panel wider than the window', () => {
  const out = PanelLayout.fit({ x: 8, y: 8, w: 2000, h: null, shownH: 100 }, view, limits);
  assert.equal(out.w, view.w - 16);
});

test('fit never goes below the minimum width', () => {
  const out = PanelLayout.fit({ x: 8, y: 8, w: 400, h: null, shownH: 100 }, { w: 200, h: 800 }, limits);
  assert.equal(out.w, 280);
  assert.equal(out.x, 8);
});

test('fit nudges a panel that hangs off the right and bottom', () => {
  const out = PanelLayout.fit({ x: 1100, y: 700, w: 400, h: 300 }, view, limits);
  assert.equal(out.x, view.w - 400 - 8);
  assert.equal(out.y, view.h - 300 - 8);
});

test('fit moves a panel at negative x and y to the margin', () => {
  const out = PanelLayout.fit({ x: -50, y: -20, w: 400, h: 300 }, view, limits);
  assert.equal(out.x, 8);
  assert.equal(out.y, 8);
});

test('fit keeps a null height and uses the shown height for the y clamp', () => {
  const out = PanelLayout.fit({ x: 10, y: 790, w: 400, h: null, shownH: 200 }, view, limits);
  assert.equal(out.h, null);
  assert.equal(out.y, view.h - 200 - 8);
});

test('fit clamps a tall height to the window', () => {
  const out = PanelLayout.fit({ x: 10, y: 10, w: 400, h: 5000 }, view, limits);
  assert.equal(out.h, view.h - 16);
});

test('fit does not change its input', () => {
  const rect = { x: -50, y: 900, w: 2000, h: 5000 };
  const copy = { ...rect };
  PanelLayout.fit(rect, view, limits);
  assert.deepEqual(rect, copy);
});

test('snap pulls a panel 10 px from the left edge onto the margin', () => {
  assert.equal(PanelLayout.snap({ x: 18, y: 300, w: 400, h: 200 }, [], view).x, 8);
});

test('snap leaves a panel 20 px from the left edge where it is', () => {
  const out = PanelLayout.snap({ x: 28, y: 300, w: 400, h: 200 }, [], view);
  assert.deepEqual(out, { x: 28, y: 300 });
});

test('snap sits a panel flush beside another one that overlaps it vertically', () => {
  const other = { x: 100, y: 300, w: 300, h: 200 };
  const out = PanelLayout.snap({ x: 405, y: 350, w: 300, h: 200 }, [other], view);
  assert.equal(out.x, 400);
});

test('snap ignores a panel that is far away vertically', () => {
  const other = { x: 100, y: 0, w: 300, h: 100 };
  const out = PanelLayout.snap({ x: 405, y: 500, w: 300, h: 200 }, [other], view);
  assert.equal(out.x, 405);
});

test('snap picks the nearest of two candidates', () => {
  const a = { x: 100, y: 300, w: 300, h: 200 };
  const b = { x: 100, y: 300, w: 306, h: 200 };
  const out = PanelLayout.snap({ x: 405, y: 350, w: 300, h: 200 }, [a, b], view);
  assert.equal(out.x, 406);
});

test('snap returns the raw position once a firm drag passes the snap point', () => {
  const other = { x: 100, y: 300, w: 300, h: 200 };
  const out = PanelLayout.snap({ x: 380, y: 350, w: 300, h: 200 }, [other], view);
  assert.equal(out.x, 380);
});

test('snapSize snaps the right edge to the window edge', () => {
  const out = PanelLayout.snapSize({ x: 100, y: 100, w: 1085, h: 300 }, [], view);
  assert.equal(out.w, view.w - 8 - 100);
});

test('snapSize leaves a right edge far from any edge alone', () => {
  const out = PanelLayout.snapSize({ x: 100, y: 100, w: 500, h: 300 }, [], view);
  assert.deepEqual(out, { w: 500, h: 300 });
});

test('snapSize snaps the right edge to another panel that overlaps vertically', () => {
  const other = { x: 700, y: 100, w: 300, h: 300 };
  const out = PanelLayout.snapSize({ x: 100, y: 150, w: 595, h: 200 }, [other], view);
  assert.equal(out.w, 600);
});

test('snapSize keeps a null height null', () => {
  const out = PanelLayout.snapSize({ x: 100, y: 100, w: 500, h: null, shownH: 690 }, [], view);
  assert.equal(out.h, null);
});

test('toFront moves an id to the end', () => {
  assert.deepEqual(PanelLayout.toFront(['a', 'b', 'c'], 'a'), ['b', 'c', 'a']);
});

test('toFront adds a missing id', () => {
  assert.deepEqual(PanelLayout.toFront(['a'], 'b'), ['a', 'b']);
});

test('toFront does not change its input', () => {
  const order = ['a', 'b'];
  PanelLayout.toFront(order, 'a');
  assert.deepEqual(order, ['a', 'b']);
});

test('dockAll turns every panel off and keeps positions', () => {
  const layout = { panels: { order: { on: true, x: 1, y: 2, w: 300, h: null }, library: { on: false, x: 5, y: 6, w: 400, h: 200 } }, order: ['order'] };
  const out = PanelLayout.dockAll(layout);
  assert.deepEqual(out.panels, { order: { on: false, x: 1, y: 2, w: 300, h: null }, library: { on: false, x: 5, y: 6, w: 400, h: 200 } });
  assert.deepEqual(out.order, ['order']);
  assert.equal(layout.panels.order.on, true);
});

test('anyFloating is true with one floating panel and false otherwise', () => {
  assert.equal(PanelLayout.anyFloating({ panels: { order: { on: true, x: 1, y: 2, w: 300, h: null } }, order: [] }), true);
  assert.equal(PanelLayout.anyFloating({ panels: { order: { on: false, x: 1, y: 2, w: 300, h: null } }, order: [] }), false);
  assert.equal(PanelLayout.anyFloating({ panels: {}, order: [] }), false);
});
