import { SourcePrice, FoilType } from '../types';
import { PriceSourceAdapter, ExtendedParsedCard } from './types';
import { convertToJPY } from '../currency';

const BASE_URL = 'https://fabarmory.com';

interface SearchProduct {
  id: number;
  title: string;
  handle: string;
  price: string;
  price_min: string;
  price_max: string;
  available: boolean;
  type: string;
  tags: string[];
  url: string;
}

interface SearchResponse {
  resources: {
    results: {
      products: SearchProduct[];
    };
  };
}

const COLORS = ['red', 'yellow', 'blue'];

function stripColorSuffix(cardName: string): { baseName: string; color: string | null } {
  const lower = cardName.toLowerCase();
  for (const color of COLORS) {
    if (lower.endsWith(` ${color}`)) {
      return {
        baseName: cardName.slice(0, -(color.length + 1)).trim(),
        color,
      };
    }
  }
  return { baseName: cardName, color: null };
}

/**
 * Search FAB Armory using Shopify predictive search API.
 * Returns full product data directly from the search response.
 */
async function searchProducts(cardName: string): Promise<SearchProduct[]> {
  const { baseName } = stripColorSuffix(cardName);
  const query = encodeURIComponent(baseName);
  const url = `${BASE_URL}/search/suggest.json?q=${query}&resources[type]=product&resources[limit]=10`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`FAB Armory search failed: ${res.status}`);
  }

  const data: SearchResponse = await res.json();
  return data.resources?.results?.products || [];
}

function normalizeForMatch(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim();
}

function matchesCardName(productTitle: string, userCardName: string): boolean {
  const productNorm = normalizeForMatch(productTitle);
  const userNorm = normalizeForMatch(userCardName);

  if (productNorm.includes(userNorm)) return true;

  // Check with color stripped
  const { baseName } = stripColorSuffix(userCardName);
  const baseNorm = normalizeForMatch(baseName);
  if (productNorm.includes(baseNorm)) return true;

  return false;
}

/**
 * Detect foil type from product title and type field.
 * FAB Armory uses separate products per foil type.
 * type field: "Regular", "Rainbow Foil", "Cold Foil"
 */
function detectFoilType(title: string, productType: string, tags: string[]): FoilType {
  const tl = title.toLowerCase();
  const pt = productType.toLowerCase();
  const allTags = tags.join(' ').toLowerCase();

  if (tl.includes('marvel') || allTags.includes('marvel')) return 'Marvel';

  if ((tl.includes('extended art') || allTags.includes('extended')) &&
      (tl.includes('rainbow') || pt.includes('rainbow'))) {
    return 'EARF';
  }

  if (tl.includes('cold foil') || pt === 'cold foil' || allTags.includes('cold foil')) return 'CF';
  if (tl.includes('rainbow foil') || pt === 'rainbow foil' || allTags.includes('rainbow foil')) return 'RF';

  // "Regular" type or no foil indicator → NF
  return 'NF';
}

/**
 * Extract set code from handle.
 * Handles like: "unl-wtr159-m" → "WTR159", "1hp361" → "1HP361"
 */
function extractSetCode(handle: string): string | null {
  // Match patterns like wtr159, 1hp361, evr046
  const match = handle.match(/([a-z]{2,5}\d{2,4})/i);
  if (match) {
    const code = match[1].toUpperCase();
    if (code.length >= 4 && /^[A-Z0-9]{2,5}\d{2,4}$/.test(code)) {
      return code;
    }
  }
  return null;
}

export const fabarmoryAdapter: PriceSourceAdapter = {
  id: 'fabarmory',
  name: 'FAB Armory',
  currency: 'NZD',
  region: 'New Zealand',
  rateLimit: 500,

  async searchCard(card: ExtendedParsedCard): Promise<SourcePrice> {
    try {
      const products = await searchProducts(card.cardName);

      if (products.length === 0) {
        return {
          source: 'fabarmory',
          currency: 'NZD',
          price: null,
          priceJPY: null,
          available: false,
          productUrl: '',
          setCode: null,
          error: 'No results found',
        };
      }

      // Find matching product with correct foil type
      for (const product of products) {
        if (!matchesCardName(product.title, card.cardName)) continue;

        const detectedFoil = detectFoilType(product.title, product.type, product.tags);
        if (detectedFoil !== card.foilType) continue;

        const price = parseFloat(product.price);
        const setCode = extractSetCode(product.handle);

        return {
          source: 'fabarmory',
          currency: 'NZD',
          price: isNaN(price) ? null : price,
          priceJPY: !isNaN(price) ? convertToJPY(price, 'NZD') : null,
          available: product.available,
          productUrl: `${BASE_URL}/products/${product.handle}`,
          setCode,
        };
      }

      return {
        source: 'fabarmory',
        currency: 'NZD',
        price: null,
        priceJPY: null,
        available: false,
        productUrl: '',
        setCode: null,
        error: `No ${card.foilType} version found`,
      };
    } catch (err) {
      return {
        source: 'fabarmory',
        currency: 'NZD',
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
