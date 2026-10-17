import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, loadVolume } from './extract-module.mjs';

const Scripture = loadModule('Scripture');

function find(text) {
  const ref = Scripture.parse(text);
  assert.ok(ref.ok, text + ' should parse: ' + ref.error);
  return Scripture.lookup(ref, loadVolume(ref.vol));
}

describe('parse accepts', () => {
  const cases = [
    ['John 3:16', 'John', 3, 16],
    ['john 3:16', 'John', 3, 16],
    ['Jn 3:16', 'John', 3, 16],
    ['1 Ne 3:7', '1 Nephi', 3, 7],
    ['1Ne. 3:7', '1 Nephi', 3, 7],
    ['1 Nephi 3:7', '1 Nephi', 3, 7],
    ['D&C 4:2', 'Doctrine and Covenants', 4, 2],
    ['DC 4:2', 'Doctrine and Covenants', 4, 2],
    ['Doctrine and Covenants 4:2', 'Doctrine and Covenants', 4, 2],
    ['JS—H 1:17', 'Joseph Smith—History', 1, 17],
    ['JS-H 1:17', 'Joseph Smith—History', 1, 17],
    ['Psalm 23:1', 'Psalms', 23, 1],
    ['Ps. 23:1', 'Psalms', 23, 1],
    ['Song of Solomon 2:1', "Solomon's Song", 2, 1]
  ];
  for (const [input, book, chapter, verse] of cases) {
    test(input, () => {
      const ref = Scripture.parse(input);
      assert.equal(ref.ok, true, ref.error);
      assert.equal(ref.book, book);
      assert.equal(ref.chapter, chapter);
      assert.equal(ref.from, verse);
      assert.equal(ref.to, verse);
    });
  }

  for (const input of ['Alma 32:21-23', 'Alma 32:21–23', 'Alma 32:21—23']) {
    test('range ' + input, () => {
      const ref = Scripture.parse(input);
      assert.equal(ref.ok, true, ref.error);
      assert.equal(ref.book, 'Alma');
      assert.equal(ref.vol, 'book-of-mormon');
      assert.equal(ref.from, 21);
      assert.equal(ref.to, 23);
    });
  }
});

describe('parse rejects', () => {
  test('an unknown book with a valid chapter and verse', () => {
    const ref = Scripture.parse('Almaa 32:21');
    assert.equal(ref.ok, false);
    assert.equal(ref.error, '“Almaa” isn’t a book of scripture this app knows. Try the full name, e.g. 1 Nephi.');
  });

  test('a known book and chapter with no verse', () => {
    const ref = Scripture.parse('Alma 32');
    assert.equal(ref.ok, false);
    assert.equal(ref.error, 'Add a verse number, e.g. Alma 32:1.');
  });

  test('a range that runs backwards', () => {
    const ref = Scripture.parse('Alma 32:23-21');
    assert.equal(ref.ok, false);
    assert.equal(ref.error, 'The range 23–21 runs backwards.');
  });

  test('a range across chapters', () => {
    const ref = Scripture.parse('Alma 32:21-33:2');
    assert.equal(ref.ok, false);
    assert.equal(ref.error, 'Ranges across chapters aren’t supported. Add each chapter separately.');
  });

  test('empty input', () => {
    const ref = Scripture.parse('');
    assert.equal(ref.ok, false);
    assert.equal(ref.error, 'Type a reference, for example John 3:16.');
  });
});

describe('parseList', () => {
  test('splits on commas, semicolons and new lines', () => {
    const results = Scripture.parseList('John 3:16, Moroni 10:4; D&C 4:2\nAlma 32:21-23');
    assert.equal(results.length, 4);
    assert.ok(results.every((r) => r.ok));
  });

  test('a bare verse inherits the book and chapter before it', () => {
    const results = Scripture.parseList('John 3:16, 18');
    assert.equal(results.length, 2);
    assert.deepEqual(results.map((r) => [r.book, r.chapter, r.from]), [['John', 3, 16], ['John', 3, 18]]);
  });

  test('a bare verse with nothing before it is rejected, and the next reference still works', () => {
    const results = Scripture.parseList('18, John 3:16');
    assert.equal(results[0].ok, false);
    assert.equal(results[1].ok, true);
  });
});

describe('lookup against the real data files', () => {
  test('John 3:16', () => {
    const found = find('John 3:16');
    assert.ok(found.ok);
    assert.match(found.verses[0].text, /^For God so loved the world/);
  });

  test('Moroni 10:4', () => {
    assert.match(find('Moroni 10:4').verses[0].text, /ask God, the Eternal Father/);
  });

  test('D&C 4:2', () => {
    assert.match(find('D&C 4:2').verses[0].text, /^Therefore, O ye that embark/);
  });

  test('JS—H 1:17', () => {
    const found = find('JS—H 1:17');
    assert.ok(found.ok);
    assert.ok(found.verses[0].text.trim().length > 0);
  });

  test('Alma 32:21-23 gives three numbered verses', () => {
    assert.deepEqual(find('Alma 32:21-23').verses.map((v) => v.n), [21, 22, 23]);
  });

  test('a verse past the end of the chapter', () => {
    const found = find('Alma 32:999');
    assert.equal(found.ok, false);
    assert.equal(found.error, 'Alma 32 has 43 verses.');
  });

  test('a chapter past the end of the book', () => {
    const found = find('Alma 99:1');
    assert.equal(found.ok, false);
    assert.equal(found.error, 'Alma has 63 chapters.');
  });

  test('a section past the end of the Doctrine and Covenants', () => {
    const found = find('D&C 139:1');
    assert.equal(found.ok, false);
    assert.equal(found.error, 'The Doctrine and Covenants has 138 sections.');
  });
});

describe('toPassage', () => {
  test('a range becomes one passage with the full reference and numbered verses', () => {
    const passage = Scripture.toPassage(find('Alma 32:21-23'));
    assert.equal(passage.ref, 'Alma 32:21–23');
    assert.deepEqual(passage.verses.map((v) => v.n), [21, 22, 23]);
    for (const verse of passage.verses) assert.ok(verse.text.trim().length > 0);
  });

  test('a single verse gives one verse and its own reference', () => {
    const passage = Scripture.toPassage(find('John 3:16'));
    assert.equal(passage.ref, 'John 3:16');
    assert.equal(passage.verses.length, 1);
  });

  test('a verse with no text is refused', () => {
    const found = find('Alma 32:21-23');
    assert.ok(found.ok);
    found.verses[1].text = '   ';
    assert.throws(() => Scripture.toPassage(found), /has no text/);
  });
});

describe('format', () => {
  test('uses D&C for the Doctrine and Covenants', () => {
    assert.equal(Scripture.format(Scripture.parse('Doctrine and Covenants 4:2')), 'D&C 4:2');
  });

  test('uses an en dash for ranges', () => {
    assert.equal(Scripture.format(Scripture.parse('John 3:16-18')), 'John 3:16–18');
  });
});

describe('data integrity', () => {
  const volumes = [...new Set(Scripture.BOOKS.map((b) => b.vol))];

  test('every book in the table exists in its volume file', () => {
    for (const book of Scripture.BOOKS) {
      assert.ok(Object.hasOwn(loadVolume(book.vol), book.name), book.name + ' missing from ' + book.vol + '.json');
    }
  });

  test('every book in the volume files is in the table', () => {
    for (const vol of volumes) {
      for (const name of Object.keys(loadVolume(vol))) {
        assert.ok(Scripture.BOOKS.some((b) => b.vol === vol && b.name === name), name + ' from ' + vol + '.json is not in BOOKS');
      }
    }
  });

  test('all five volumes are covered', () => {
    assert.deepEqual(volumes.sort(), ['book-of-mormon', 'doctrine-and-covenants', 'new-testament', 'old-testament', 'pearl-of-great-price']);
  });
});
