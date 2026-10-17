import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const SOURCE = 'https://raw.githubusercontent.com/bcbooks/scriptures-json/master/';
const VOLUMES = ['old-testament', 'new-testament', 'book-of-mormon', 'doctrine-and-covenants', 'pearl-of-great-price'];
const outDir = fileURLToPath(new URL('../public/scriptures/', import.meta.url));

async function download(volume) {
  const url = SOURCE + volume + '.json';
  const response = await fetch(url);
  if (!response.ok) throw new Error('Could not download ' + url + ': ' + response.status);
  return response.json();
}

function verseTexts(verses, where) {
  return verses.map((verse, index) => {
    if (verse.verse !== index + 1) throw new Error(where + ': expected verse ' + (index + 1) + ' but found ' + verse.verse);
    if (typeof verse.text !== 'string' || !verse.text.trim()) throw new Error(where + ':' + verse.verse + ' has no text');
    return verse.text;
  });
}

function compact(source) {
  const result = {};
  if (source.sections) {
    result['Doctrine and Covenants'] = source.sections.map((section, index) => {
      if (section.section !== index + 1) throw new Error('D&C: expected section ' + (index + 1) + ' but found ' + section.section);
      return verseTexts(section.verses, 'D&C ' + section.section);
    });
    return result;
  }
  for (const book of source.books) {
    result[book.book] = book.chapters.map((chapter, index) => {
      if (chapter.chapter !== index + 1) throw new Error(book.book + ': expected chapter ' + (index + 1) + ' but found ' + chapter.chapter);
      return verseTexts(chapter.verses, book.book + ' ' + chapter.chapter);
    });
  }
  return result;
}

async function main() {
  const built = [];
  for (const volume of VOLUMES) {
    const data = compact(await download(volume));
    built.push({ volume, data, json: JSON.stringify(data) });
  }
  await mkdir(outDir, { recursive: true });
  for (const { volume, data, json } of built) {
    await writeFile(outDir + volume + '.json', json);
    console.log(volume + '.json: ' + Object.keys(data).length + ' books, ' + Buffer.byteLength(json) + ' bytes');
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
