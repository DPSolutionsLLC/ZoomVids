import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const ProjectFolders = loadModule('ProjectFolders');
const FinishedMark = loadModule('FinishedMark');
const PlaylistSave = loadModule('PlaylistSave');
const SEP = ProjectFolders.SEP;
const y2026 = { id: 'pf2026', name: '2026 songs' };
const y2027 = { id: 'pf2027', name: '2027 songs' };
const folders = [y2026, y2027];
const key = ProjectFolders.keyOf;

test('keyOf and parseKey round-trip, and a plain name is in No folder', () => {
  assert.equal(key('', 'Silent Night'), 'Silent Night');
  assert.equal(key('pf2026', 'Silent Night'), 'pf2026' + SEP + 'Silent Night');
  assert.deepEqual(ProjectFolders.parseKey(key('pf2026', 'Silent Night')), { folder: 'pf2026', name: 'Silent Night' });
  assert.deepEqual(ProjectFolders.parseKey('Silent Night'), { folder: '', name: 'Silent Night' });
  assert.deepEqual(ProjectFolders.parseKey('pf1' + SEP + 'a' + SEP + 'b'), { folder: 'pf1', name: 'a' + SEP + 'b' });
});

test('cleanList keeps valid folders, A to Z, and drops bad or repeated entries', () => {
  assert.deepEqual(ProjectFolders.cleanList(null), []);
  assert.deepEqual(ProjectFolders.cleanList({ id: 'pf1', name: 'x' }), []);
  const raw = [
    { id: 'pf2', name: 'b folder' },
    { id: 'pf1', name: '  A   folder ' },
    { name: 'no id' },
    { id: 'bad id', name: 'bad' },
    { id: 'pf3', name: '   ' },
    { id: 'pf1', name: 'repeated id' },
    { id: 'pf4', name: 'B FOLDER' },
    null
  ];
  const before = JSON.stringify(raw);
  assert.deepEqual(ProjectFolders.cleanList(raw), [{ id: 'pf1', name: 'A folder' }, { id: 'pf2', name: 'b folder' }]);
  assert.equal(JSON.stringify(raw), before);
});

test('cleanFolder and cleanView drop folders that are gone', () => {
  assert.equal(ProjectFolders.cleanFolder('pf2026', folders), 'pf2026');
  assert.equal(ProjectFolders.cleanFolder('pfgone', folders), '');
  assert.equal(ProjectFolders.cleanFolder(undefined, folders), '');
  assert.deepEqual(ProjectFolders.cleanView(null, folders), { pick: '*', closed: {} });
  assert.deepEqual(ProjectFolders.cleanView({ pick: '' }, folders), { pick: '', closed: {} });
  assert.deepEqual(ProjectFolders.cleanView({ pick: 'pfgone' }, folders).pick, '*');
  assert.deepEqual(ProjectFolders.cleanView({ pick: 'pf2027', closed: { '': true, pf2026: true, pfgone: true, pf2027: 'yes' } }, folders),
    { pick: 'pf2027', closed: { '': true, pf2026: true } });
});

test('make refuses an empty name or one another folder has, ignoring case', () => {
  assert.equal(ProjectFolders.make(folders, '   ', 'pfnew').result, 'empty');
  const taken = ProjectFolders.make(folders, '2026 SONGS', 'pfnew');
  assert.equal(taken.result, 'taken');
  assert.equal(taken.list, folders);
  const made = ProjectFolders.make(folders, ' 2025  songs ', 'pfnew');
  assert.equal(made.result, 'made');
  assert.equal(made.id, 'pfnew');
  assert.deepEqual(made.list.map((f) => f.name), ['2025 songs', '2026 songs', '2027 songs']);
  assert.equal(folders.length, 2);
});

test('rename checks the name against the other folders only', () => {
  assert.equal(ProjectFolders.rename(folders, 'pf2026', '  ').result, 'empty');
  assert.equal(ProjectFolders.rename(folders, 'pfgone', 'Hymns').result, 'missing');
  assert.equal(ProjectFolders.rename(folders, 'pf2026', '2026 songs').result, 'same');
  assert.equal(ProjectFolders.rename(folders, 'pf2026', '2027 Songs').result, 'taken');
  const recased = ProjectFolders.rename(folders, 'pf2026', '2026 Songs');
  assert.equal(recased.result, 'renamed');
  assert.deepEqual(ProjectFolders.find(recased.list, 'pf2026'), { id: 'pf2026', name: '2026 Songs' });
  const renamed = ProjectFolders.rename(folders, 'pf2027', 'Choir');
  assert.deepEqual(renamed.list.map((f) => f.id), ['pf2026', 'pf2027']);
  assert.equal(y2027.name, '2027 songs');
});

test('nameTaken ignores the folder being renamed', () => {
  assert.equal(ProjectFolders.nameTaken(folders, '2026 songs', 'pf2026'), false);
  assert.equal(ProjectFolders.nameTaken(folders, '2026 songs', 'pf2027'), true);
});

test('move rekeys a song and leaves the input alone', () => {
  const saved = { 'Silent Night': { a: 1 }, [key('pf2026', 'Joy')]: { b: 1 } };
  const before = JSON.stringify(saved);
  const r = ProjectFolders.move(saved, 'Silent Night', 'pf2026');
  assert.equal(r.result, 'moved');
  assert.equal(r.key, key('pf2026', 'Silent Night'));
  assert.deepEqual(Object.keys(r.saved).sort(), [key('pf2026', 'Joy'), key('pf2026', 'Silent Night')].sort());
  assert.deepEqual(r.saved[r.key], { a: 1 });
  assert.equal(JSON.stringify(saved), before);
  const back = ProjectFolders.move(r.saved, r.key, '');
  assert.equal(back.result, 'moved');
  assert.equal(back.key, 'Silent Night');
});

test('move refuses a folder that already has the name, and changes nothing', () => {
  const saved = { 'Silent Night': { here: 'none' }, [key('pf2026', 'Silent Night')]: { here: '2026' } };
  const before = structuredClone(saved);
  const r = ProjectFolders.move(saved, 'Silent Night', 'pf2026');
  assert.equal(r.result, 'taken');
  assert.equal(r.saved, saved);
  assert.deepEqual(saved, before);
});

test('move reports the same folder and a missing song', () => {
  const saved = { [key('pf2026', 'Joy')]: {} };
  assert.equal(ProjectFolders.move(saved, key('pf2026', 'Joy'), 'pf2026').result, 'same');
  assert.equal(ProjectFolders.move(saved, 'Joy', 'pf2026').result, 'missing');
});

test('renameSong works inside a folder and keeps the folder in the key', () => {
  const saved = { [key('pf2026', 'Joy')]: { a: 1 }, [key('pf2026', 'Hope')]: { b: 1 }, Peace: { c: 1 } };
  const r = ProjectFolders.renameSong(saved, 'pf2026', 'Joy', ' Joy  to the World ', false);
  assert.equal(r.result, 'renamed');
  assert.deepEqual(r.saved[key('pf2026', 'Joy to the World')], { a: 1 });
  assert.equal(key('pf2026', 'Joy') in r.saved, false);
  assert.equal(ProjectFolders.renameSong(saved, 'pf2026', 'Joy', 'Hope', false).result, 'taken');
  assert.equal(ProjectFolders.renameSong(saved, 'pf2026', 'Joy', 'Peace', false).result, 'renamed');
  assert.equal(ProjectFolders.renameSong(saved, 'pf2026', 'Joy', ' ', false).result, 'empty');
  assert.equal(ProjectFolders.renameSong(saved, 'pf2026', 'Joy', 'Joy', false).result, 'same');
  const replaced = ProjectFolders.renameSong(saved, 'pf2026', 'Joy', 'Hope', true);
  assert.deepEqual(replaced.saved[key('pf2026', 'Hope')], { a: 1 });
});

test('renameSong in No folder matches PlaylistSave.rename', () => {
  const saved = { Easter: { a: 1 }, Advent: { b: 1 } };
  for (const [to, replace] of [['Lent', false], ['Advent', false], ['Advent', true], ['  ', false], ['Easter', false]]) {
    assert.deepEqual(ProjectFolders.renameSong(saved, '', 'Easter', to, replace), PlaylistSave.rename(saved, 'Easter', to, replace));
  }
  assert.deepEqual(ProjectFolders.renameSong(saved, '', 'Unsaved', 'Advent', true), PlaylistSave.rename(saved, 'Unsaved', 'Advent', true));
});

test('removeFolder moves its songs to No folder and renames clashes', () => {
  const saved = {
    'Silent Night': { where: 'none' },
    'Silent Night (2026 songs)': { where: 'none, already renamed' },
    [key('pf2026', 'Silent Night')]: { where: '2026' },
    [key('pf2026', 'Joy')]: { where: '2026 joy' },
    [key('pf2027', 'Silent Night')]: { where: '2027' }
  };
  const before = JSON.stringify(saved);
  const r = ProjectFolders.removeFolder(folders, saved, 'pf2026');
  assert.deepEqual(r.list, [y2027]);
  assert.deepEqual(r.saved['Silent Night (2026 songs) 2'], { where: '2026' });
  assert.deepEqual(r.saved.Joy, { where: '2026 joy' });
  assert.deepEqual(r.saved['Silent Night'], { where: 'none' });
  assert.deepEqual(r.saved['Silent Night (2026 songs)'], { where: 'none, already renamed' });
  assert.deepEqual(r.saved[key('pf2027', 'Silent Night')], { where: '2027' });
  assert.equal(Object.keys(r.saved).length, 5);
  assert.deepEqual(r.moves.sort((a, b) => (a.to < b.to ? -1 : 1)), [
    { from: key('pf2026', 'Joy'), to: 'Joy' },
    { from: key('pf2026', 'Silent Night'), to: 'Silent Night (2026 songs) 2' }
  ]);
  assert.equal(JSON.stringify(saved), before);
});

test('removeFolder gives "Name (Folder)" on the first clash', () => {
  const r = ProjectFolders.removeFolder(folders, { 'Silent Night': {}, [key('pf2026', 'Silent Night')]: { x: 1 } }, 'pf2026');
  assert.deepEqual(r.saved['Silent Night (2026 songs)'], { x: 1 });
  assert.deepEqual(r.moves, [{ from: key('pf2026', 'Silent Night'), to: 'Silent Night (2026 songs)' }]);
});

test('namesIn lists one folder only, so copies count up inside that folder', () => {
  const saved = { 'Silent Night': {}, 'Silent Night copy': {}, [key('pf2026', 'Silent Night')]: {} };
  assert.deepEqual(ProjectFolders.namesIn(saved, 'pf2026'), { 'Silent Night': true });
  assert.deepEqual(ProjectFolders.namesIn(saved, ''), { 'Silent Night': true, 'Silent Night copy': true });
  assert.equal(PlaylistSave.copyName('Silent Night', ProjectFolders.namesIn(saved, 'pf2026')), 'Silent Night copy');
  assert.equal(PlaylistSave.copyName('Silent Night', ProjectFolders.namesIn(saved, '')), 'Silent Night copy 2');
});

test('counts and pickerOptions, with an unknown folder counted as No folder', () => {
  const saved = { a: {}, b: {}, [key('pf2026', 'c')]: {}, [key('pfgone', 'd')]: {} };
  const count = ProjectFolders.counts(saved, folders);
  assert.deepEqual(count, { '*': 4, '': 3, pf2026: 1, pf2027: 0 });
  assert.deepEqual(ProjectFolders.pickerOptions(folders, count), [
    { value: '*', label: 'All songs (4)' },
    { value: '', label: 'No folder (3)' },
    { value: 'pf2026', label: '2026 songs (1)' },
    { value: 'pf2027', label: '2027 songs (0)' }
  ]);
});

test('openList with no folders and All songs matches FinishedMark.groups exactly', () => {
  const saved = { b: {}, A: { finished: true }, a: {}, Z: { finished: true }, c: { items: [] }, 'Élan': {}, '10 hymns': {}, '2 hymns': {} };
  const list = ProjectFolders.openList(saved, [], '*');
  const groups = FinishedMark.groups(saved);
  assert.deepEqual(list.open.map((r) => r.key), groups.open);
  assert.deepEqual(list.open.map((r) => r.label), groups.open);
  assert.deepEqual(list.done.map((r) => r.key), groups.done);
  assert.deepEqual(list.done.map((r) => r.label), groups.done);
});

test('openList filters by No folder or by one folder', () => {
  const saved = { Joy: {}, [key('pf2026', 'Hope')]: {}, [key('pfgone', 'Lost')]: {}, [key('pf2027', 'Peace')]: {} };
  assert.deepEqual(ProjectFolders.openList(saved, folders, '').open.map((r) => r.key), ['Joy', key('pfgone', 'Lost')]);
  assert.deepEqual(ProjectFolders.openList(saved, folders, 'pf2026').open, [{ key: key('pf2026', 'Hope'), label: 'Hope' }]);
  assert.deepEqual(ProjectFolders.openList(saved, folders, 'pf2027').done, []);
});

test('openList under All songs labels only names that live in more than one place', () => {
  const saved = {
    [key('pf2026', 'Silent Night')]: {},
    'Silent Night': { finished: true },
    [key('pf2027', 'Silent Night')]: {},
    [key('pf2026', 'Joy')]: {}
  };
  const all = ProjectFolders.openList(saved, folders, '*');
  assert.deepEqual(all.open, [
    { key: key('pf2026', 'Joy'), label: 'Joy' },
    { key: key('pf2026', 'Silent Night'), label: 'Silent Night (2026 songs)' },
    { key: key('pf2027', 'Silent Night'), label: 'Silent Night (2027 songs)' }
  ]);
  assert.deepEqual(all.done, [{ key: 'Silent Night', label: 'Silent Night (No folder)' }]);
  const one = ProjectFolders.openList(saved, folders, 'pf2026');
  assert.deepEqual(one.open.map((r) => r.label), ['Joy', 'Silent Night']);
});

test('openList puts No folder first when names tie', () => {
  const saved = { [key('pf2026', 'Joy')]: {}, Joy: {} };
  assert.deepEqual(ProjectFolders.openList(saved, folders, '*').open.map((r) => r.label), ['Joy (No folder)', 'Joy (2026 songs)']);
});

test('songs lists No folder first, then folders A to Z with songs A to Z, empty ones included', () => {
  const saved = { Zion: {}, [key('pf2027', 'b')]: { finished: true }, [key('pf2027', 'a')]: {}, Abide: {}, [key('pfgone', 'Lost')]: {} };
  const out = ProjectFolders.songs(saved, [y2027, y2026]);
  assert.deepEqual(out.map((g) => [g.folder, g.name]), [['', 'No folder'], ['pf2026', '2026 songs'], ['pf2027', '2027 songs']]);
  assert.deepEqual(out[0].items.map((it) => it.name), ['Abide', 'Lost', 'Zion']);
  assert.deepEqual(out[1].items, []);
  assert.deepEqual(out[2].items, [
    { key: key('pf2027', 'a'), name: 'a', finished: false },
    { key: key('pf2027', 'b'), name: 'b', finished: true }
  ]);
});
