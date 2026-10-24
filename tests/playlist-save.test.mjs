import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const PlaylistSave = loadModule('PlaylistSave');

test('copyName adds "copy", then counts up from 2 while the name is taken', () => {
  assert.equal(PlaylistSave.copyName('Easter', { Easter: {} }), 'Easter copy');
  assert.equal(PlaylistSave.copyName('Easter', { Easter: {}, 'Easter copy': {} }), 'Easter copy 2');
  assert.equal(PlaylistSave.copyName('Easter', { Easter: {}, 'Easter copy': {}, 'Easter copy 2': {} }), 'Easter copy 3');
});

test('copyName never bumps a number already in the name', () => {
  assert.equal(PlaylistSave.copyName('Sacrament 2026-10-26', { 'Sacrament 2026-10-26': {} }), 'Sacrament 2026-10-26 copy');
});

test('copyName of a copy adds another "copy"', () => {
  assert.equal(PlaylistSave.copyName('Easter copy', { 'Easter copy': {} }), 'Easter copy copy');
});

test('rename refuses a blank or whitespace name and leaves saved alone', () => {
  const saved = { A: { n: 1 } };
  for (const to of ['', '   ', null]) {
    const r = PlaylistSave.rename(saved, 'A', to, false);
    assert.equal(r.result, 'empty');
    assert.deepEqual(r.saved, { A: { n: 1 } });
  }
});

test('rename to the same name, after cleaning, does nothing', () => {
  const saved = { A: { n: 1 } };
  const r = PlaylistSave.rename(saved, 'A', '  A ', false);
  assert.equal(r.result, 'same');
  assert.deepEqual(r.saved, { A: { n: 1 } });
});

test('rename onto a taken name without replace is refused and touches neither entry', () => {
  const saved = { A: { n: 1 }, B: { n: 2 } };
  const r = PlaylistSave.rename(saved, 'A', 'B', false);
  assert.equal(r.result, 'taken');
  assert.deepEqual(r.saved, { A: { n: 1 }, B: { n: 2 } });
});

test('rename onto a taken name with replace moves the old entry over it', () => {
  const r = PlaylistSave.rename({ A: { n: 1 }, B: { n: 2 } }, 'A', 'B', true);
  assert.equal(r.result, 'renamed');
  assert.deepEqual(r.saved, { B: { n: 1 } });
});

test('rename to a free name moves the entry and drops the old key', () => {
  const r = PlaylistSave.rename({ A: { n: 1 }, C: { n: 3 } }, 'A', 'A2', false);
  assert.equal(r.result, 'renamed');
  assert.deepEqual(r.saved, { A2: { n: 1 }, C: { n: 3 } });
});

test('rename cleans the new name before saving under it', () => {
  const r = PlaylistSave.rename({ A: { n: 1 } }, 'A', '  Easter   Sunday ', false);
  assert.deepEqual(Object.keys(r.saved), ['Easter Sunday']);
});

test('rename of a name that was never saved adds no keys', () => {
  const r = PlaylistSave.rename({ C: { n: 3 } }, 'A', 'A2', false);
  assert.equal(r.result, 'renamed');
  assert.deepEqual(r.saved, { C: { n: 3 } });
});

test('rename with replace of a never-saved name keeps the replaced entry until the next save', () => {
  const r = PlaylistSave.rename({ B: { n: 2 } }, 'A', 'B', true);
  assert.equal(r.result, 'renamed');
  assert.deepEqual(r.saved, { B: { n: 2 } });
});

test('rename never changes the object passed in', () => {
  const saved = { A: { n: 1 }, B: { n: 2 } };
  const before = structuredClone(saved);
  PlaylistSave.rename(saved, 'A', 'A2', false);
  PlaylistSave.rename(saved, 'A', 'B', true);
  assert.deepEqual(saved, before);
});

test('put returns a new object holding the entry and leaves its input alone', () => {
  const saved = { A: { n: 1 } };
  const before = structuredClone(saved);
  const out = PlaylistSave.put(saved, 'B', { n: 2 });
  assert.deepEqual(out, { A: { n: 1 }, B: { n: 2 } });
  assert.notEqual(out, saved);
  assert.deepEqual(saved, before);
});

test('put refuses an empty name', () => {
  assert.throws(() => PlaylistSave.put({}, '', { n: 1 }));
});

test('remove returns a new object without the entry and leaves its input alone', () => {
  const saved = { A: { n: 1 }, B: { n: 2 } };
  const before = structuredClone(saved);
  const out = PlaylistSave.remove(saved, 'A');
  assert.deepEqual(out, { B: { n: 2 } });
  assert.notEqual(out, saved);
  assert.deepEqual(saved, before);
});

test('remove of a missing name returns an equal object', () => {
  assert.deepEqual(PlaylistSave.remove({ A: { n: 1 } }, 'Z'), { A: { n: 1 } });
});

test('status of an unnamed playlist asks for a name, even when pending or failed', () => {
  for (const state of [{}, { pending: true }, { failed: true }, { pending: true, failed: true }]) {
    assert.deepEqual(PlaylistSave.status(Object.assign({ named: false }, state)), { text: 'Name it to keep it', warn: false });
  }
});

test('status of a named playlist shows a failed save as a warning', () => {
  assert.deepEqual(PlaylistSave.status({ named: true, pending: true, failed: true }), { text: 'Couldn’t save', warn: true });
});

test('status of a named playlist shows saving and saved', () => {
  assert.deepEqual(PlaylistSave.status({ named: true, pending: true, failed: false }), { text: 'Saving…', warn: false });
  assert.deepEqual(PlaylistSave.status({ named: true, pending: false, failed: false }), { text: 'Saved', warn: false });
});

test('cleanName collapses inner spaces, trims and turns null into an empty string', () => {
  assert.equal(PlaylistSave.cleanName('  Easter   Sunday  '), 'Easter Sunday');
  assert.equal(PlaylistSave.cleanName(null), '');
  assert.equal(PlaylistSave.cleanName(undefined), '');
});
