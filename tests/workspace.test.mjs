import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const Workspace = loadModule('Workspace');
const { HYMN, KARAOKE } = Workspace;
const NAME_FIELDS = ['prefix', 'dbName', 'dataFile', 'pickerId'];

test('fromPath picks karaoke only for the karaoke address', () => {
  for (const path of ['/karaoke', '/karaoke/', '/KARAOKE']) {
    assert.equal(Workspace.fromPath(path), KARAOKE, path);
  }
});

test('fromPath picks hymn for every other address', () => {
  for (const path of ['/', '/index.html', '', undefined, null, '/karaoke/extra', '/karaokes', '/x/karaoke']) {
    assert.equal(Workspace.fromPath(path), HYMN, String(path));
  }
});

test('storageKey keeps hymn keys as they are', () => {
  assert.equal(Workspace.storageKey(HYMN, 'hp.work'), 'hp.work');
});

test('storageKey moves karaoke keys to the kp. prefix', () => {
  assert.equal(Workspace.storageKey(KARAOKE, 'hp.work'), 'kp.work');
  assert.equal(Workspace.storageKey(KARAOKE, 'hp.layout'), 'kp.layout');
  assert.equal(Workspace.storageKey(KARAOKE, 'hp.savedAt'), 'kp.savedAt');
});

test('storageKey leaves keys without the hp. prefix unchanged', () => {
  assert.equal(Workspace.storageKey(HYMN, 'other'), 'other');
  assert.equal(Workspace.storageKey(KARAOKE, 'other'), 'other');
});

test('ownsKey accepts only keys with the workspace prefix', () => {
  assert.equal(Workspace.ownsKey(KARAOKE, 'kp.work'), true);
  assert.equal(Workspace.ownsKey(HYMN, 'hp.work'), true);
  assert.equal(Workspace.ownsKey(KARAOKE, 'hp.work'), false);
  assert.equal(Workspace.ownsKey(HYMN, 'kp.work'), false);
});

test('ownsKey refuses anything that is not a string', () => {
  for (const ws of [HYMN, KARAOKE]) {
    assert.equal(Workspace.ownsKey(ws, null), false);
    assert.equal(Workspace.ownsKey(ws, 42), false);
  }
});

test('the two workspaces use different storage names', () => {
  for (const field of NAME_FIELDS) {
    assert.notEqual(HYMN[field], KARAOKE[field], field);
  }
});

test('each workspace links to the other one', () => {
  assert.equal(HYMN.other.href, KARAOKE.home);
  assert.equal(KARAOKE.other.href, HYMN.home);
});

test('hymn storage names are unchanged for existing users', () => {
  assert.equal(HYMN.prefix, 'hp.');
  assert.equal(HYMN.dbName, 'hymn-playlist');
  assert.equal(HYMN.dataFile, 'hymn-playlist-data.json');
  assert.equal(HYMN.pickerId, 'hymn-playlist-music');
});

test('configs cannot be changed', () => {
  try { KARAOKE.prefix = 'hp.'; } catch (error) { assert.ok(error instanceof TypeError); }
  try { KARAOKE.other.href = '/'; } catch (error) { assert.ok(error instanceof TypeError); }
  assert.equal(KARAOKE.prefix, 'kp.');
  assert.equal(KARAOKE.other.href, '/');
  assert.ok(Object.isFrozen(HYMN));
  assert.ok(Object.isFrozen(HYMN.other));
  assert.ok(Object.isFrozen(KARAOKE.other));
});

test('every config field is filled in', () => {
  for (const ws of [HYMN, KARAOKE]) {
    for (const [field, value] of Object.entries(ws)) {
      if (field === 'other') {
        assert.ok(typeof value.name === 'string' && value.name.length > 0, ws.id + '.other.name');
        assert.ok(typeof value.href === 'string' && value.href.length > 0, ws.id + '.other.href');
      } else {
        assert.ok(typeof value === 'string' && value.length > 0, ws.id + '.' + field);
      }
    }
  }
});
