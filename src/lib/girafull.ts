import { FoilType, ParsedCard, CardSearchResult, CardLanguage, DualCardResult } from './types';

const BASE_URL = 'https://ec.girafull.co.jp';

interface ProductHandle {
  handle: string;
}

interface ProductVariant {
  id: number;
  title: string;
  price: string;
  available?: boolean;
}

interface ProductJSON {
  product: {
    title: string;
    handle: string;
    images: { src: string }[];
    variants: ProductVariant[];
    tags: string[];
  };
}

// Phase 1: Search Girafull for product handles (regex-based, no cheerio)
async function searchProducts(cardName: string): Promise<ProductHandle[]> {
  const query = encodeURIComponent(`【EN】${cardName}`);
  const url = `${BASE_URL}/search?type=product&q=${query}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CardCrew/1.0)',
      'Accept': 'text/html',
    },
  });

  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }

  const html = await res.text();
  const handles: ProductHandle[] = [];
  const seen = new Set<string>();

  // Extract all /products/{handle} links from HTML
  const regex = /href=["']\/products\/([^"'?#]+)/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const handle = match[1];
    if (!seen.has(handle)) {
      seen.add(handle);
      handles.push({ handle });
    }
  }

  return handles;
}

// Check if a product handle matches a language
function matchesLanguage(handle: string, lang: CardLanguage): boolean {
  const h = handle.toLowerCase();
  const hasEN = h.includes('_langen');
  const hasJP = h.includes('_langjp');

  if (!hasEN && !hasJP) return true; // No language suffix = matches both
  if (lang === 'EN') return hasEN;
  return hasJP;
}

// Search products with language-specific query
async function searchProductsForLang(cardName: string, lang: CardLanguage): Promise<ProductHandle[]> {
  const queryStr = lang === 'EN' ? `【EN】${cardName}` : `【JP】${cardName}`;
  const query = encodeURIComponent(queryStr);
  const url = `${BASE_URL}/search?type=product&q=${query}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CardCrew/1.0)',
      'Accept': 'text/html',
    },
  });

  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }

  const html = await res.text();
  const handles: ProductHandle[] = [];
  const seen = new Set<string>();

  const regex = /href=["']\/products\/([^"'?#]+)/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const handle = match[1];
    if (!seen.has(handle)) {
      seen.add(handle);
      handles.push({ handle });
    }
  }

  return handles;
}

// Search for a card in a specific language
async function searchCardForLang(card: ParsedCard, lang: CardLanguage): Promise<CardSearchResult | null> {
  try {
    const handles = await searchProductsForLang(card.cardName, lang);

    for (const handle of handles) {
      if (!matchesLanguage(handle.handle, lang)) continue;

      const productData = await fetchProductJSON(handle.handle);
      if (!productData) continue;

      const product = productData.product;

      if (!matchesFoilType(product.handle, product.title, product.tags, card.foilType)) {
        continue;
      }

      if (!matchesCardName(product.title, card.cardName)) {
        continue;
      }

      const { price, available } = extractNMPrice(product.variants);
      const imageUrl = product.images.length > 0 ? product.images[0].src : null;
      const setCode = extractCardId(product.title, product.handle);

      return {
        cardName: card.cardName,
        foilType: card.foilType,
        quantity: card.quantity,
        productTitle: product.title,
        price,
        imageUrl,
        available,
        productUrl: `${BASE_URL}/products/${product.handle}`,
        setCode,
      };
    }

    return null;
  } catch {
    return null;
  }
}

// Search for both EN and JP versions of a card
export async function searchCardDual(card: ParsedCard): Promise<DualCardResult> {
  const [en, jp] = await Promise.all([
    searchCardForLang(card, 'EN'),
    searchCardForLang(card, 'JP'),
  ]);

  return {
    cardName: card.cardName,
    foilType: card.foilType,
    quantity: card.quantity,
    en,
    jp,
  };
}

// Phase 2: Fetch product JSON
async function fetchProductJSON(handle: string): Promise<ProductJSON | null> {
  const url = `${BASE_URL}/products/${handle}.json`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CardCrew/1.0)',
      'Accept': 'application/json',
    },
  });

  if (!res.ok) return null;

  try {
    return await res.json() as ProductJSON;
  } catch {
    return null;
  }
}

// Check if a product handle matches the foil type
function matchesFoilType(handle: string, title: string, tags: string[], foilType: FoilType): boolean {
  const h = handle.toLowerCase();
  const t = title;

  switch (foilType) {
    case 'NF':
      return h.includes('_foils_') && !t.includes('〈RF〉') && !t.includes('〈CF〉');
    case 'RF':
      return (h.includes('_foilr_') && t.includes('〈RF〉') && !t.toLowerCase().includes('extended art'));
    case 'CF':
      return h.includes('_foilc_') && t.includes('〈CF〉');
    case 'EARF':
      return (h.includes('_foilr_') && (h.includes('_artea_') || t.toLowerCase().includes('extended art')) && t.includes('〈RF〉'));
    case 'Marvel':
      return tags.some(tag => tag.toLowerCase().includes('rarity_v'));
    default:
      return false;
  }
}

// Extract the English card name from a product title
function extractEnglishName(title: string): string {
  let name = title.replace(/【EN】/g, '');
  name = name.replace(/〈[A-Z]+〉\s*/g, '');
  name = name.replace(/Extended Art\s*/i, '');
  const slashIndex = name.indexOf('/');
  if (slashIndex !== -1) {
    name = name.substring(0, slashIndex);
  }
  return name.trim();
}

function normalizeForMatch(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

function matchesCardName(productTitle: string, userCardName: string): boolean {
  const productName = normalizeForMatch(extractEnglishName(productTitle));
  const fullTitle = normalizeForMatch(productTitle);
  const userNormalized = normalizeForMatch(userCardName);

  // Direct match against English name
  if (productName.includes(userNormalized)) return true;

  // Direct match against full title (covers JP titles where English name is after /)
  if (fullTitle.includes(userNormalized)) return true;

  // Handle color: user types "Take the Bait Red"
  // Title may have color as "(Red)" anywhere in the full title
  const colors = ['red', 'yellow', 'blue'];
  for (const color of colors) {
    if (userNormalized.endsWith(` ${color}`)) {
      const baseName = userNormalized.slice(0, -(color.length + 1));
      if ((productName.includes(baseName) || fullTitle.includes(baseName)) && fullTitle.includes(`(${color})`)) {
        return true;
      }
    }
  }

  return false;
}

// Extract NM price from variants
// Girafull sets price to 0 for sold-out grades; available field may not exist in JSON
function extractNMPrice(variants: ProductVariant[]): { price: number | null; available: boolean } {
  const nmVariant = variants.find(v => {
    const t = v.title.toLowerCase();
    return t.includes('nm') || t.includes('near mint');
  });

  if (nmVariant) {
    const price = parseInt(nmVariant.price, 10);
    return {
      price,
      available: nmVariant.available ?? price > 0,
    };
  }

  if (variants.length > 0) {
    const price = parseInt(variants[0].price, 10);
    return {
      price,
      available: variants[0].available ?? price > 0,
    };
  }

  return { price: null, available: false };
}

// Extract card identifier like "SUP256" from product title [SUP256] or handle prefix
function extractCardId(title: string, handle: string): string | null {
  // Try title first: e.g. "【EN】New Horizon/新たな視野 [SUP256]"
  const titleMatch = title.match(/\[([A-Z]{2,5}\d+)\]/i);
  if (titleMatch) return titleMatch[1].toUpperCase();

  // Fallback: parse handle prefix before _foil, e.g. "sup256_foils_langen" → "SUP256"
  const handleMatch = handle.match(/^([a-z]{2,5}\d+)/i);
  if (handleMatch) return handleMatch[1].toUpperCase();

  return null;
}

// Main search function for a single card
// If card.lang is set, search that specific language; otherwise default to EN
export async function searchCard(card: ParsedCard): Promise<CardSearchResult> {
  const lang: CardLanguage = card.lang || 'EN';

  try {
    const handles = await searchProductsForLang(card.cardName, lang);

    if (handles.length === 0) {
      return {
        cardName: card.cardName,
        foilType: card.foilType,
        quantity: card.quantity,
        productTitle: '',
        price: null,
        imageUrl: null,
        available: false,
        productUrl: '',
        setCode: null,
        error: 'No results found',
      };
    }

    for (const handle of handles) {
      if (!matchesLanguage(handle.handle, lang)) continue;

      const productData = await fetchProductJSON(handle.handle);
      if (!productData) continue;

      const product = productData.product;

      if (!matchesFoilType(product.handle, product.title, product.tags, card.foilType)) {
        continue;
      }

      if (!matchesCardName(product.title, card.cardName)) {
        continue;
      }

      const { price, available } = extractNMPrice(product.variants);
      const imageUrl = product.images.length > 0 ? product.images[0].src : null;
      const setCode = extractCardId(product.title, product.handle);

      return {
        cardName: card.cardName,
        foilType: card.foilType,
        quantity: card.quantity,
        productTitle: product.title,
        price,
        imageUrl,
        available,
        productUrl: `${BASE_URL}/products/${product.handle}`,
        setCode,
      };
    }

    return {
      cardName: card.cardName,
      foilType: card.foilType,
      quantity: card.quantity,
      productTitle: '',
      price: null,
      imageUrl: null,
      available: false,
      productUrl: '',
      setCode: null,
      error: `No ${card.foilType} version found`,
    };
  } catch (err) {
    return {
      cardName: card.cardName,
      foilType: card.foilType,
      quantity: card.quantity,
      productTitle: '',
      price: null,
      imageUrl: null,
      available: false,
      productUrl: '',
      setCode: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
