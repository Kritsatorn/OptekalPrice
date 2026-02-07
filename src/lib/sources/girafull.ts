import { SourcePrice, FoilType, CardLanguage } from '../types';
import { PriceSourceAdapter, ExtendedParsedCard } from './types';
import { convertToJPY } from '../currency';

const BASE_URL = 'https://ec.girafull.co.jp';

interface ProductHandle {
  handle: string;
}

interface ProductVariant {
  id: number;
  title: string;
  price: number;
  available: boolean;
}

interface ProductJS {
  title: string;
  handle: string;
  images: string[];
  variants: ProductVariant[];
  tags: string[];
}

// Search products with language-specific query
async function searchProductsForLang(cardName: string, lang: CardLanguage): Promise<ProductHandle[]> {
  const queryStr = lang === 'EN' ? `【EN】${cardName}` : `【JP】${cardName}`;
  const query = encodeURIComponent(queryStr);
  const url = `${BASE_URL}/search?type=product&q=${query}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; OptekalPrice/1.0)',
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

// Check if a product handle matches a language
function matchesLanguage(handle: string, lang: CardLanguage): boolean {
  const h = handle.toLowerCase();
  const hasEN = h.includes('_langen');
  const hasJP = h.includes('_langjp');

  if (!hasEN && !hasJP) return true;
  if (lang === 'EN') return hasEN;
  return hasJP;
}

// Fetch product JS
async function fetchProductJS(handle: string): Promise<ProductJS | null> {
  const url = `${BASE_URL}/products/${handle}.js`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; OptekalPrice/1.0)',
      'Accept': 'application/json',
    },
  });

  if (!res.ok) return null;

  try {
    return await res.json() as ProductJS;
  } catch {
    return null;
  }
}

// Detect foil type from product data
function detectFoilType(handle: string, title: string, tags: string[]): FoilType | null {
  const h = handle.toLowerCase();
  const t = title;
  const tl = title.toLowerCase();

  if (tags.some(tag => tag.toLowerCase().includes('rarity_v'))) return 'Marvel';
  if (h.includes('_foilr_') && (h.includes('_artea_') || tl.includes('extended art')) && t.includes('〈RF〉')) return 'EARF';
  if (h.includes('_foilr_') && t.includes('〈RF〉')) return 'RF';
  if (h.includes('_foilc_') && t.includes('〈CF〉')) return 'CF';
  if (h.includes('_foils_') && !t.includes('〈RF〉') && !t.includes('〈CF〉')) return 'NF';

  return null;
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

  if (productName.includes(userNormalized)) return true;
  if (fullTitle.includes(userNormalized)) return true;

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
function extractNMPrice(variants: ProductVariant[]): { price: number | null; available: boolean } {
  const nmVariant = variants.find(v => {
    const t = v.title.toLowerCase();
    return t.includes('nm') || t.includes('near mint');
  });

  if (nmVariant) {
    return {
      price: Math.round(nmVariant.price / 100),
      available: nmVariant.available,
    };
  }

  if (variants.length > 0) {
    return {
      price: Math.round(variants[0].price / 100),
      available: variants[0].available,
    };
  }

  return { price: null, available: false };
}

// Extract card identifier
function extractCardId(title: string, handle: string): string | null {
  const titleMatch = title.match(/\[([A-Z]{2,5}\d+)\]/i);
  if (titleMatch) return titleMatch[1].toUpperCase();

  const handleMatch = handle.match(/^([a-z]{2,5}\d+)/i);
  if (handleMatch) return handleMatch[1].toUpperCase();

  return null;
}

/**
 * Girafull price source adapter
 */
export const girafullAdapter: PriceSourceAdapter = {
  id: 'girafull',
  name: 'Girafull',
  currency: 'JPY',
  region: 'Japan',
  rateLimit: 300,

  async searchCard(card: ExtendedParsedCard): Promise<SourcePrice> {
    const lang: CardLanguage = card.lang || 'EN';

    try {
      const handles = await searchProductsForLang(card.cardName, lang);
      const langHandles = handles.filter(h => matchesLanguage(h.handle, lang));

      if (langHandles.length === 0) {
        return {
          source: 'girafull',
          currency: 'JPY',
          price: null,
          priceJPY: null,
          available: false,
          productUrl: '',
          setCode: null,
          error: 'No results found',
        };
      }

      // Fetch all matching products concurrently
      const products = await Promise.all(
        langHandles.map(h => fetchProductJS(h.handle))
      );

      for (const product of products) {
        if (!product) continue;
        if (!matchesCardName(product.title, card.cardName)) continue;

        const detectedFoil = detectFoilType(product.handle, product.title, product.tags);
        if (detectedFoil !== card.foilType) continue;

        const { price, available } = extractNMPrice(product.variants);
        const setCode = extractCardId(product.title, product.handle);

        return {
          source: 'girafull',
          currency: 'JPY',
          price,
          priceJPY: price ? convertToJPY(price, 'JPY') : null,
          available,
          productUrl: `${BASE_URL}/products/${product.handle}`,
          setCode,
        };
      }

      return {
        source: 'girafull',
        currency: 'JPY',
        price: null,
        priceJPY: null,
        available: false,
        productUrl: '',
        setCode: null,
        error: `No ${card.foilType} version found`,
      };
    } catch (err) {
      return {
        source: 'girafull',
        currency: 'JPY',
        price: null,
        priceJPY: null,
        available: false,
        productUrl: '',
        setCode: null,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
};
