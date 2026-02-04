import { cards } from '@flesh-and-blood/cards';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface CompactPrinting {
  s: string;   // set name
  img: string; // image identifier
  id: string;  // printing identifier (e.g. "ARC003")
  e?: string;  // edition (Alpha, First, Unlimited, Promo)
  f?: string;  // foiling (Cold, Gold, Rainbow)
  a?: string;  // treatment/art variant (Alternate Art, Extended Art, etc.)
}

interface CompactCard {
  n: string;            // name
  id: string;           // cardIdentifier
  img: string;          // defaultImage (for CDN URL)
  sets: string[];       // set codes
  p?: number;           // pitch (1=red, 2=yellow, 3=blue)
  t: string[];          // types
  c: string[];          // classes
  pr: CompactPrinting[]; // printings
}

const seen = new Set<string>();
const compactCards: CompactCard[] = [];

for (const card of cards) {
  // Skip card backs
  if (card.isCardBack) continue;

  // Skip duplicates by cardIdentifier
  if (seen.has(card.cardIdentifier)) continue;
  seen.add(card.cardIdentifier);

  // Deduplicate printings by image (same image = same visual)
  const seenImages = new Set<string>();
  const printings: CompactPrinting[] = [];
  for (const pr of card.printings) {
    if (!pr.image || seenImages.has(pr.image)) continue;
    seenImages.add(pr.image);

    const cp: CompactPrinting = {
      s: pr.set,
      img: pr.image,
      id: pr.identifier,
    };
    if (pr.edition) cp.e = pr.edition;
    if (pr.foiling) cp.f = pr.foiling;
    if (pr.treatment) cp.a = pr.treatment;
    printings.push(cp);
  }

  const compact: CompactCard = {
    n: card.name,
    id: card.cardIdentifier,
    img: card.defaultImage || '',
    sets: card.sets,
    t: card.types,
    c: card.classes,
    pr: printings,
  };

  if (card.pitch !== undefined) {
    compact.p = card.pitch;
  }

  compactCards.push(compact);
}

// Sort by name for consistent output
compactCards.sort((a, b) => a.n.localeCompare(b.n));

const outDir = join(process.cwd(), 'public', 'data');
mkdirSync(outDir, { recursive: true });

const outPath = join(outDir, 'cards.json');
writeFileSync(outPath, JSON.stringify(compactCards));

const sizeKB = Math.round(Buffer.byteLength(JSON.stringify(compactCards)) / 1024);
console.log(`Generated ${outPath}`);
console.log(`  ${compactCards.length} cards, ${sizeKB}KB`);
