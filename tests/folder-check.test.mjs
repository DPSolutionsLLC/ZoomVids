import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const FolderCheck = loadModule('FolderCheck');

function passing(changes = {}) {
  return { visible: true, linked: true, needsPermission: false, scanning: false, exporting: false, now: 100000, lastCheckAt: 50000, ...changes };
}

test('MIN_GAP_MS is 10 seconds', () => {
  assert.equal(FolderCheck.MIN_GAP_MS, 10000);
});

test('shouldCheck is true in the happy case', () => {
  assert.equal(FolderCheck.shouldCheck(passing()), true);
});

test('shouldCheck is false for each single blocker', () => {
  assert.equal(FolderCheck.shouldCheck(passing({ visible: false })), false);
  assert.equal(FolderCheck.shouldCheck(passing({ linked: false })), false);
  assert.equal(FolderCheck.shouldCheck(passing({ needsPermission: true })), false);
  assert.equal(FolderCheck.shouldCheck(passing({ scanning: true })), false);
  assert.equal(FolderCheck.shouldCheck(passing({ exporting: true })), false);
  assert.equal(FolderCheck.shouldCheck(passing({ lastCheckAt: 100000 - 9999 })), false);
});

test('shouldCheck is true at exactly 10 000 ms', () => {
  assert.equal(FolderCheck.shouldCheck(passing({ lastCheckAt: 90000 })), true);
});

test('shouldCheck is true when there was no check before', () => {
  assert.equal(FolderCheck.shouldCheck(passing({ lastCheckAt: 0 })), true);
  assert.equal(FolderCheck.shouldCheck(passing({ lastCheckAt: undefined })), true);
});

test('summary is null when nothing changed', () => {
  assert.equal(FolderCheck.summary({ added: 0, removed: 0, moved: 0, sameName: 0 }), null);
});

test('summary uses singular wording for one', () => {
  assert.equal(FolderCheck.summary({ added: 1, removed: 0, moved: 0, sameName: 0 }), '1 new recording.');
  assert.equal(FolderCheck.summary({ added: 0, removed: 1, moved: 0, sameName: 0 }), '1 recording is no longer in the folder.');
  assert.equal(FolderCheck.summary({ added: 0, removed: 0, moved: 1, sameName: 0 }), '1 moved to another folder.');
  assert.equal(FolderCheck.summary({ added: 0, removed: 0, moved: 0, sameName: 1 }), '1 new file has the same name as a missing one. Is it the same recording?');
});

test('summary uses plural wording for more than one', () => {
  assert.equal(FolderCheck.summary({ added: 3, removed: 0, moved: 0, sameName: 0 }), '3 new recordings.');
  assert.equal(FolderCheck.summary({ added: 0, removed: 2, moved: 0, sameName: 0 }), '2 recordings are no longer in the folder.');
  assert.equal(FolderCheck.summary({ added: 0, removed: 0, moved: 4, sameName: 0 }), '4 moved to other folders.');
  assert.equal(FolderCheck.summary({ added: 0, removed: 0, moved: 0, sameName: 2 }), '2 new files have the same names as missing ones. Are they the same recordings?');
});

test('summary joins parts in a fixed order with single spaces', () => {
  assert.equal(
    FolderCheck.summary({ sameName: 1, moved: 2, removed: 1, added: 2 }),
    '2 new recordings. 1 recording is no longer in the folder. 2 moved to other folders. 1 new file has the same name as a missing one. Is it the same recording?'
  );
});

test('summary treats missing counts as zero', () => {
  assert.equal(FolderCheck.summary({ sameName: 1 }), '1 new file has the same name as a missing one. Is it the same recording?');
});
