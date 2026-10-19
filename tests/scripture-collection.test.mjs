import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const SC = loadModule('ScriptureCollection');

const R = (book, chapter, from, to) => ({ book, vol: 'book-of-mormon', chapter, from, to: to ?? from });
const item = (id, range, tags = []) => Object.assign({ id, tags, added: '2026-10-01' }, range);
const coll = (...items) => ({ v: 1, items });
const use = (date, range, playlist = 'Sunday') => ({ date, book: range.book, chapter: range.chapter, from: range.from, to: range.to, playlist });
const ids = () => { let n = 0; return () => 'x' + (++n); };

describe('clean', () => {
  test('missing or broken data gives an empty collection', () => {
    for (const raw of [null, [], 'x', 5]) assert.deepEqual(SC.clean(raw), { v: 1, items: [] });
  });
  test('drops items with chapter 0 or a backwards range, keeps valid ones', () => {
    const out = SC.clean({ items: [item('a', R('Alma', 0, 1)), item('b', R('Alma', 32, 23, 21)), item('c', R('Alma', 32, 21))] });
    assert.deepEqual(out.items.map((it) => it.id), ['c']);
  });
  test('missing tags become an empty list', () => {
    const out = SC.clean({ items: [Object.assign({ id: 'a' }, R('Alma', 32, 21))] });
    assert.deepEqual(out.items[0].tags, []);
  });
  test('an item without an id gets one, never an empty string', () => {
    const out = SC.clean({ items: [R('Alma', 32, 21)] });
    assert.ok(out.items[0].id.length > 0);
  });
});

describe('cleanUses', () => {
  test('drops a use whose date is not a date', () => {
    const good = use('2026-10-12', R('Alma', 32, 21));
    const bad = Object.assign({}, good, { date: 'yesterday' });
    assert.deepEqual(SC.cleanUses([good, bad]), [good]);
  });
  test('missing data gives no uses', () => {
    assert.deepEqual(SC.cleanUses(null), []);
  });
});

describe('sameRange and overlaps', () => {
  test('a range overlaps a verse inside it', () => {
    assert.equal(SC.overlaps(R('Alma', 32, 21, 23), R('Alma', 32, 23)), true);
  });
  test('neighbouring verses do not overlap', () => {
    assert.equal(SC.overlaps(R('Alma', 32, 21, 23), R('Alma', 32, 24)), false);
  });
  test('the same verses in another chapter do not overlap', () => {
    assert.equal(SC.overlaps(R('Alma', 32, 21, 23), R('Alma', 33, 21, 23)), false);
  });
  test('the same chapter and verses in another book do not overlap', () => {
    assert.equal(SC.overlaps(R('Alma', 32, 21, 23), R('Mosiah', 32, 21, 23)), false);
  });
  test('sameRange needs every number to match', () => {
    assert.equal(SC.sameRange(R('Alma', 32, 21, 23), R('Alma', 32, 21, 23)), true);
    assert.equal(SC.sameRange(R('Alma', 32, 21, 23), R('Alma', 32, 21, 22)), false);
  });
});

describe('add', () => {
  test('adds new ranges', () => {
    const res = SC.add(coll(), [R('Alma', 32, 21, 23), R('Moroni', 10, 4), R('Ether', 12, 27)], '2026-10-19', ids());
    assert.equal(res.added.length, 3);
    assert.equal(res.collection.items.length, 3);
    assert.equal(res.added[0].added, '2026-10-19');
  });
  test('an exact duplicate is reported and not added', () => {
    const start = coll(item('a', R('Alma', 32, 21, 23)));
    const res = SC.add(start, [R('Alma', 32, 21, 23)], '2026-10-19', ids());
    assert.equal(res.added.length, 0);
    assert.equal(res.duplicates.length, 1);
    assert.equal(res.collection.items.length, 1);
  });
  test('the same range twice in one add is added once', () => {
    const res = SC.add(coll(), [R('Alma', 32, 21), R('Alma', 32, 21)], '2026-10-19', ids());
    assert.equal(res.added.length, 1);
    assert.equal(res.duplicates.length, 1);
  });
  test('an overlapping but different range is added', () => {
    const res = SC.add(coll(item('a', R('Alma', 32, 21, 23))), [R('Alma', 32, 21)], '2026-10-19', ids());
    assert.equal(res.added.length, 1);
  });
  test('the collection passed in is not changed', () => {
    const start = coll(item('a', R('Alma', 32, 21, 23)));
    const copy = JSON.parse(JSON.stringify(start));
    SC.add(start, [R('Moroni', 10, 4)], '2026-10-19', ids());
    assert.deepEqual(start, copy);
  });
});

describe('remove', () => {
  test('removes only the given item', () => {
    const out = SC.remove(coll(item('a', R('Alma', 32, 21)), item('b', R('Moroni', 10, 4))), 'a');
    assert.deepEqual(out.items.map((it) => it.id), ['b']);
  });
});

describe('tags', () => {
  test('a tag typed in different case reuses the existing spelling', () => {
    const start = coll(item('a', R('Alma', 32, 21), ['Faith']), item('b', R('Moroni', 10, 4)));
    const out = SC.addTag(start, 'b', 'faith');
    assert.deepEqual(out.items[1].tags, ['Faith']);
  });
  test('adding a tag twice keeps one', () => {
    const once = SC.addTag(coll(item('a', R('Alma', 32, 21))), 'a', 'Hope');
    assert.deepEqual(SC.addTag(once, 'a', 'hope').items[0].tags, ['Hope']);
  });
  test('removeTag removes it', () => {
    const out = SC.removeTag(coll(item('a', R('Alma', 32, 21), ['Faith', 'Hope'])), 'a', 'faith');
    assert.deepEqual(out.items[0].tags, ['Hope']);
  });
  test('cleanTag refuses blank and over-long tags and tidies spaces', () => {
    assert.equal(SC.cleanTag('  '), null);
    assert.equal(SC.cleanTag('x'.repeat(31)), null);
    assert.equal(SC.cleanTag('x'.repeat(30)), 'x'.repeat(30));
    assert.equal(SC.cleanTag('  Holy   Ghost '), 'Holy Ghost');
  });
  test('allTags counts and sorts without regard to case', () => {
    const c = coll(item('a', R('Alma', 32, 21), ['hope', 'Faith']), item('b', R('Moroni', 10, 4), ['Faith']));
    assert.deepEqual(SC.allTags(c), [{ tag: 'Faith', count: 2 }, { tag: 'hope', count: 1 }]);
  });
  test('withTag filters, and an empty tag returns everything', () => {
    const items = [item('a', R('Alma', 32, 21), ['Faith']), item('b', R('Moroni', 10, 4))];
    assert.equal(SC.withTag(items, '').length, 2);
    assert.deepEqual(SC.withTag(items, 'FAITH').map((it) => it.id), ['a']);
  });
});

describe('sortItems', () => {
  test('orders by book order, then chapter, then verse', () => {
    const items = [item('a', R('Alma', 32, 21)), item('b', R('1 Nephi', 3, 7)), item('c', R('Alma', 5, 9)), item('d', R('Alma', 5, 2))];
    assert.deepEqual(SC.sortItems(items, ['1 Nephi', 'Alma']).map((it) => it.id), ['b', 'd', 'c', 'a']);
  });
});

describe('usesOf and lastUse', () => {
  const uses = [use('2026-09-01', R('Alma', 32, 21, 23)), use('2026-10-05', R('Alma', 32, 22)), use('2026-10-12', R('Alma', 33, 1))];
  test('a use of a range counts for a verse inside it, newest first', () => {
    assert.deepEqual(SC.usesOf(uses, R('Alma', 32, 22)).map((u) => u.date), ['2026-10-05', '2026-09-01']);
  });
  test('a use in another chapter does not count', () => {
    assert.equal(SC.usesOf(uses, R('Alma', 33, 2)).length, 0);
  });
  test('lastUse is the newest date, or null when never used', () => {
    assert.equal(SC.lastUse(uses, R('Alma', 32, 22)), '2026-10-05');
    assert.equal(SC.lastUse(uses, R('Alma', 32, 21)), '2026-09-01');
    assert.equal(SC.lastUse(uses, R('Moroni', 10, 4)), null);
  });
});

describe('recordUses', () => {
  test('recording the same date and playlist again replaces the first set', () => {
    const first = SC.recordUses([], [R('Alma', 32, 21)], '2026-10-12', 'Oct 12');
    const second = SC.recordUses(first, [R('Moroni', 10, 4)], '2026-10-12', 'Oct 12');
    assert.deepEqual(second.map((u) => u.book), ['Moroni']);
  });
  test('another playlist on the same date keeps both', () => {
    const first = SC.recordUses([], [R('Alma', 32, 21)], '2026-10-12', 'Morning');
    const second = SC.recordUses(first, [R('Moroni', 10, 4)], '2026-10-12', 'Evening');
    assert.equal(second.length, 2);
  });
  test('a range repeated in one video is stored once', () => {
    assert.equal(SC.recordUses([], [R('Alma', 32, 21), R('Alma', 32, 21)], '2026-10-12', 'x').length, 1);
  });
});

describe('overlapsWith', () => {
  test('returns only the entries that overlap', () => {
    const others = [{ range: R('Alma', 32, 21, 23), label: 'Alma 32:21–23' }, { range: R('Moroni', 10, 4), label: 'Moroni 10:4' }];
    assert.deepEqual(SC.overlapsWith(R('Alma', 32, 22), others).map((o) => o.label), ['Alma 32:21–23']);
  });
});

describe('pickOrder and randomPick', () => {
  const never = item('n', R('Moroni', 10, 4));
  const old = item('o', R('Alma', 32, 21));
  const recent = item('r', R('Ether', 12, 27));
  const uses = [use('2026-01-01', old), use('2026-10-01', recent)];
  const zero = () => 0;
  test('never-used first, then oldest use first', () => {
    assert.deepEqual(SC.pickOrder([recent, old, never], uses, zero).map((it) => it.id), ['n', 'o', 'r']);
  });
  test('skips a pick that overlaps the video and takes the next', () => {
    const res = SC.randomPick([recent, old, never], uses, [{ range: R('Moroni', 10, 3, 5) }], zero);
    assert.equal(res.item.id, 'o');
    assert.equal(res.last, '2026-01-01');
  });
  test('a never-used pick reports last as null', () => {
    assert.equal(SC.randomPick([never], uses, [], zero).last, null);
  });
  test('nothing is picked when everything overlaps', () => {
    assert.equal(SC.randomPick([old], uses, [{ range: R('Alma', 32, 20, 22) }], zero), null);
  });
});

describe('suggestTags', () => {
  const topics = SC.TOPICS;
  test('tags of an overlapping reference come first', () => {
    const others = [{ range: R('Alma', 32, 21, 23), text: 'unrelated words here', tags: ['Faith'] }];
    assert.equal(SC.suggestTags(R('Alma', 32, 21), 'something else entirely', others, topics)[0], 'Faith');
  });
  test('tags of a reference in the same chapter are suggested', () => {
    const others = [{ range: R('Alma', 32, 40), text: 'unrelated words here', tags: ['Hope'] }];
    assert.ok(SC.suggestTags(R('Alma', 32, 21), 'nothing matching', others, topics).includes('Hope'));
  });
  test('tags of a reference with similar wording are suggested', () => {
    const text = 'nourish the word planted seed swell growing tree';
    const others = [{ range: R('Moroni', 7, 1), text: text, tags: ['Growth'] }];
    assert.ok(SC.suggestTags(R('Alma', 33, 1), text, others, []).includes('Growth'));
  });
  test('a starter topic is matched by a keyword', () => {
    assert.ok(SC.suggestTags(R('Alma', 32, 21), 'and now as I said concerning faith', [], topics).includes('Faith'));
  });
  test('a prefix keyword matches longer words', () => {
    assert.ok(SC.suggestTags(R('Alma', 34, 19), 'pray always', [], topics).includes('Prayer'));
  });
  test('a whole-word keyword does not match inside a longer word', () => {
    assert.ok(!SC.suggestTags(R('Alma', 41, 2), 'restore all things', [], topics).includes('Rest'));
  });
  test('at most six, with no repeats in different case', () => {
    const others = [{ range: R('Alma', 32, 21), text: '', tags: ['faith', 'A', 'B', 'C', 'D', 'E', 'F'] }];
    const out = SC.suggestTags(R('Alma', 32, 21), 'faith', others, topics);
    assert.equal(out.length, 6);
    assert.equal(out.filter((t) => t.toLowerCase() === 'faith').length, 1);
  });
});

describe('similarity', () => {
  test('the same text is 1, texts with nothing in common are 0', () => {
    assert.equal(SC.similarity('faith hope charity', 'faith hope charity'), 1);
    assert.equal(SC.similarity('faith hope charity', 'mountain river stone'), 0);
  });
  test('short and common words are ignored', () => {
    assert.equal(SC.similarity('unto them that', 'unto them that'), 0);
  });
});
