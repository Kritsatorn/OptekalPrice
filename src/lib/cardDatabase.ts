interface CompactPrinting {
  s: string;
  img: string;
  id: string;
  e?: string;
  f?: string;
  a?: string;
}

interface CompactCard {
  n: string;
  id: string;
  img: string;
  sets: string[];
  p?: number;
  t: string[];
  c: string[];
  pr: CompactPrinting[];
}

export interface CardPrinting {
  set: string;
  image: string;
  identifier: string;
  edition?: string;
  foiling?: string;
  treatment?: string;
}

export interface BrowserCard {
  name: string;
  cardIdentifier: string;
  defaultImage: string;
  sets: string[];
  pitch?: number;
  types: string[];
  classes: string[];
  printings: CardPrinting[];
}

const CDN_BASE = 'https://d2wlb52bya4y8z.cloudfront.net/media/cards/large';

let cachedCards: BrowserCard[] | null = null;

export async function loadCardDatabase(): Promise<BrowserCard[]> {
  if (cachedCards) return cachedCards;

  const res = await fetch('/data/cards.json');
  if (!res.ok) throw new Error('Failed to load card database');

  const compact: CompactCard[] = await res.json();
  cachedCards = compact.map((c) => ({
    name: c.n,
    cardIdentifier: c.id,
    defaultImage: c.img,
    sets: c.sets,
    pitch: c.p,
    types: c.t,
    classes: c.c,
    printings: c.pr.map((pr) => ({
      set: pr.s,
      image: pr.img,
      identifier: pr.id,
      edition: pr.e,
      foiling: pr.f,
      treatment: pr.a,
    })),
  }));

  return cachedCards;
}

export function searchCards(
  allCards: BrowserCard[],
  query: string,
  limit = 60,
): BrowserCard[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const prefixMatches: BrowserCard[] = [];
  const substringMatches: BrowserCard[] = [];

  for (const card of allCards) {
    const name = card.name.toLowerCase();
    if (name.startsWith(q)) {
      prefixMatches.push(card);
    } else if (name.includes(q)) {
      substringMatches.push(card);
    }

    if (prefixMatches.length + substringMatches.length >= limit) break;
  }

  return [...prefixMatches, ...substringMatches].slice(0, limit);
}

export function getCardImageUrl(imageId: string): string {
  return `${CDN_BASE}/${imageId}.webp`;
}

const pitchToColor: Record<number, string> = { 1: 'Red', 2: 'Yellow', 3: 'Blue' };

/** Returns full card name with pitch color, e.g. "Take the Bait Red" */
export function getCardDisplayName(card: BrowserCard): string {
  const color = card.pitch !== undefined ? pitchToColor[card.pitch] : undefined;
  return color ? `${card.name} ${color}` : card.name;
}
