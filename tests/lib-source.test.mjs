import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const LibSource = loadModule('LibSource');
const NOT_A_LINK = 'That doesn’t look like a web link. Paste the address from the browser’s address bar.';

const noInfo = () => undefined;
const songInfo = () => ({ kind: 'song' });

test('clean gives no url for blank or whitespace text', () => {
  assert.deepEqual(LibSource.clean(''), { url: null });
  assert.deepEqual(LibSource.clean('   '), { url: null });
});

test('clean adds https:// when there is no scheme', () => {
  assert.deepEqual(LibSource.clean('www.churchofjesuschrist.org/study/x'), { url: 'https://www.churchofjesuschrist.org/study/x' });
});

test('clean keeps an http:// link', () => {
  assert.deepEqual(LibSource.clean('http://example.com/talk'), { url: 'http://example.com/talk' });
});

test('clean refuses a javascript: link', () => {
  assert.deepEqual(LibSource.clean('javascript:alert(1)'), { error: NOT_A_LINK });
});

test('clean refuses an ftp:// link', () => {
  assert.deepEqual(LibSource.clean('ftp://a.b/c'), { error: NOT_A_LINK });
});

test('clean refuses a host with no dot', () => {
  assert.deepEqual(LibSource.clean('hello'), { error: NOT_A_LINK });
});

test('linkFor prefers the record’s own source over a talk url', () => {
  const link = LibSource.linkFor({ source: 'https://own.example/a' }, { kind: 'talk', url: 'talk.example/b' });
  assert.equal(link, 'https://own.example/a');
});

test('linkFor falls back to the cleaned talk url', () => {
  assert.equal(LibSource.linkFor({ folder: '' }, { kind: 'talk', url: 'talk.example/b' }), 'https://talk.example/b');
});

test('linkFor gives null for a song with a url', () => {
  assert.equal(LibSource.linkFor({ folder: '' }, { kind: 'song', url: 'talk.example/b' }), null);
});

test('linkFor gives null for an undefined record or info', () => {
  assert.equal(LibSource.linkFor(undefined, undefined), null);
  assert.equal(LibSource.linkFor(undefined, { kind: 'song' }), null);
  assert.equal(LibSource.linkFor({ folder: '' }, undefined), null);
});

test('linkFor gives null when the talk url is not a web link', () => {
  assert.equal(LibSource.linkFor({ folder: '' }, { kind: 'talk', url: 'hello' }), null);
});

test('keyName and keySize split a library key', () => {
  assert.equal(LibSource.keyName('Talk.mp4|1234'), 'Talk.mp4');
  assert.equal(LibSource.keySize('Talk.mp4|1234'), 1234);
});

function records() {
  return {
    'Present.mp3|10': { folder: 'Music', source: 'https://a.example/1' },
    'sample:1': { folder: '', source: 'https://a.example/2' },
    'Hidden.mp3|20': { folder: 'Music', source: 'https://a.example/3', unlisted: true },
    'NoLink.mp3|30': { folder: 'Music' },
    '10 Talk.mp4|40': { folder: 'Conference/Oct', info: { kind: 'talk', url: 'talk.example/x' } },
    '2 Song.mp3|50': { folder: '', source: 'https://a.example/5' }
  };
}
const infoFromRecords = (recs) => (key) => recs[key] && recs[key].info;

test('missing lists only absent, linked, listed, non-sample records', () => {
  const recs = records();
  const list = LibSource.missing(recs, { 'Present.mp3|10': true }, infoFromRecords(recs));
  assert.deepEqual(list.map((x) => x.key), ['2 Song.mp3|50', '10 Talk.mp4|40']);
});

test('missing includes a talk-fallback record with its cleaned link', () => {
  const recs = records();
  const talk = LibSource.missing(recs, {}, infoFromRecords(recs)).find((x) => x.key === '10 Talk.mp4|40');
  assert.equal(talk.link, 'https://talk.example/x');
});

test('missing sorts by name numerically, drops the extension and keeps the folder', () => {
  const recs = records();
  const list = LibSource.missing(recs, { 'Present.mp3|10': true }, infoFromRecords(recs));
  assert.deepEqual(list, [
    { key: '2 Song.mp3|50', name: '2 Song', folder: '', link: 'https://a.example/5' },
    { key: '10 Talk.mp4|40', name: '10 Talk', folder: 'Conference/Oct', link: 'https://talk.example/x' }
  ]);
});

test('missing does not change its input', () => {
  const recs = records();
  const before = JSON.stringify(recs);
  LibSource.missing(recs, {}, infoFromRecords(recs));
  assert.equal(JSON.stringify(recs), before);
});

const gone = (key, name) => ({ key, name, folder: '', link: 'https://a.example' });

test('nameMatches pairs the same name with a different size', () => {
  assert.deepEqual(LibSource.nameMatches(['Talk.mp4|200'], [gone('Talk.mp4|100', 'Talk')]), [{ from: 'Talk.mp4|100', to: 'Talk.mp4|200', name: 'Talk' }]);
});

test('nameMatches does not pair the same name and the same size', () => {
  assert.deepEqual(LibSource.nameMatches(['Talk.mp4|100'], [gone('Talk.mp4|100', 'Talk')]), []);
});

test('nameMatches does not pair different names', () => {
  assert.deepEqual(LibSource.nameMatches(['Other.mp4|200'], [gone('Talk.mp4|100', 'Talk')]), []);
});

test('nameMatches skips a name with two new keys', () => {
  assert.deepEqual(LibSource.nameMatches(['Talk.mp4|200', 'Talk.mp4|300'], [gone('Talk.mp4|100', 'Talk')]), []);
});

test('nameMatches skips a name with two missing keys', () => {
  assert.deepEqual(LibSource.nameMatches(['Talk.mp4|200'], [gone('Talk.mp4|100', 'Talk'), gone('Talk.mp4|150', 'Talk')]), []);
});

function moveRecords() {
  return {
    'Talk.mp4|100': { folder: 'Old', info: { kind: 'talk', speaker: 'A' }, used: ['2026-10-04'], hymn: { n: 2, v: 1 }, clips: [{ date: '2026-10-04', a: 1, b: 2 }], source: 'https://a.example', unlisted: true },
    'Talk.mp4|200': { folder: 'New', info: {}, used: [] }
  };
}

test('moveRecord moves details and takes the folder from the new record', () => {
  const out = LibSource.moveRecord(moveRecords(), 'Talk.mp4|100', 'Talk.mp4|200');
  assert.deepEqual(out['Talk.mp4|200'], {
    folder: 'New', info: { kind: 'talk', speaker: 'A' }, used: ['2026-10-04'], hymn: { n: 2, v: 1 }, clips: [{ date: '2026-10-04', a: 1, b: 2 }], source: 'https://a.example'
  });
});

test('moveRecord drops unlisted and deletes the old key', () => {
  const out = LibSource.moveRecord(moveRecords(), 'Talk.mp4|100', 'Talk.mp4|200');
  assert.equal('unlisted' in out['Talk.mp4|200'], false);
  assert.equal('Talk.mp4|100' in out, false);
});

test('moveRecord does not change its input', () => {
  const recs = moveRecords();
  const before = JSON.stringify(recs);
  const out = LibSource.moveRecord(recs, 'Talk.mp4|100', 'Talk.mp4|200');
  out['Talk.mp4|200'].info.speaker = 'Changed';
  assert.equal(JSON.stringify(recs), before);
});

function mixWith() {
  return {
    name: 'Sunday',
    items: [{ id: 'm1', key: 'Talk.mp4|100', name: 'Talk', in: 3, out: 40 }, { id: 'm2', key: 'Song.mp3|5', name: 'Song' }],
    spoken: [{ id: 's1', key: 'Talk.mp4|100', name: 'Talk', at: 150 }],
    texts: [{ id: 't1', text: 'Talk.mp4|100' }]
  };
}

test('rekeyMix renames matching items and spoken entries', () => {
  const out = LibSource.rekeyMix(mixWith(), 'Talk.mp4|100', 'Talk.mp4|200', 'Talk new');
  assert.deepEqual(out.items[0], { id: 'm1', key: 'Talk.mp4|200', name: 'Talk new', in: 3, out: 40 });
  assert.deepEqual(out.spoken[0], { id: 's1', key: 'Talk.mp4|200', name: 'Talk new', at: 150 });
});

test('rekeyMix leaves other entries and texts alone', () => {
  const out = LibSource.rekeyMix(mixWith(), 'Talk.mp4|100', 'Talk.mp4|200', 'Talk new');
  assert.deepEqual(out.items[1], { id: 'm2', key: 'Song.mp3|5', name: 'Song' });
  assert.deepEqual(out.texts, mixWith().texts);
});

test('rekeyMix does not change its input', () => {
  const m = mixWith();
  const before = JSON.stringify(m);
  LibSource.rekeyMix(m, 'Talk.mp4|100', 'Talk.mp4|200', 'Talk new');
  assert.equal(JSON.stringify(m), before);
});

test('missing skips records with no link when info is a song', () => {
  assert.deepEqual(LibSource.missing({ 'A.mp3|1': { folder: '' } }, {}, songInfo), []);
  assert.deepEqual(LibSource.missing({ 'A.mp3|1': { folder: '' } }, {}, noInfo), []);
});
