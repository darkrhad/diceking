import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import fetchCards from 'api/gameApi';

const ROOT = join(__dirname, '../..');

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|js|json|html)$/.test(name) ? [path] : [];
  });

it('ships the full deck: 15 village, 10 penalty, 40 citizen cards and 6 dice', async () => {
  const cards = await fetchCards();
  expect(cards.cityCards).toHaveLength(15);
  expect(cards.penaltyCards).toHaveLength(10);
  expect(cards.citizenCards).toHaveLength(40);
  expect(cards.dices).toHaveLength(6);
});

it('has every card image in public/', async () => {
  const cards = await fetchCards();
  const pictures = [...cards.cityCards, ...cards.citizenCards, ...cards.penaltyCards]
    .flatMap((card) => [card.picture, card.backPicture])
    .filter(Boolean);
  expect(pictures).toHaveLength(65);
  pictures.forEach((picture) => expect(existsSync(join(ROOT, 'public', picture))).toBe(true));
});

it('returns a fresh copy, so one game cannot change the next', async () => {
  const first = await fetchCards();
  first.cityCards.splice(0);
  expect((await fetchCards()).cityCards).toHaveLength(15);
});

it('loads no game assets from remote hosts', () => {
  // Multiplayer still needs Firebase and the TURN servers; haba.de is a link
  const allowed = /firestore\.googleapis\.com|firestore\.test|haba\.de|reactjs\.org|w3\.org|developers\.google\.com|metered\.ca/;
  const offenders = [...sourceFiles(join(ROOT, 'src')), join(ROOT, 'public/index.html')].flatMap((file) =>
    (readFileSync(file, 'utf8').match(/https?:\/\/[^'"`\s)]+/g) || [])
      .filter((url) => !url.startsWith('http://localhost') && !allowed.test(url))
      .map((url) => `${file.replace(ROOT, '')}: ${url}`)
  );
  expect(offenders).toEqual([]);
});

it('references only images that exist in public/images', () => {
  const missing = sourceFiles(join(ROOT, 'src')).flatMap((file) =>
    (readFileSync(file, 'utf8').match(/\/images\/[\w./${}-]+\.(png|jpe?g)/g) || [])
      .flatMap((path) =>
        path.includes('${') ? [1, 2, 3, 4, 5, 6].map((i) => path.replace(/\$\{\w+\}/, String(i))) : [path]
      )
      .filter((path) => !existsSync(join(ROOT, 'public', path)))
      .map((path) => `${file.replace(ROOT, '')}: ${path}`)
  );
  expect(missing).toEqual([]);
});
