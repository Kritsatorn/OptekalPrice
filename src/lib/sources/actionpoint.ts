import { SourcePrice, FoilType } from '../types';
import { PriceSourceAdapter, ExtendedParsedCard } from './types';
import { convertToJPY } from '../currency';

const BASE_URL = 'https://actionpoint.sg';

interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  available: boolean;
  option1: string | null;
  option2: string | null;
  option3: string | null;
}

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  variants: ShopifyVariant[];
  images: Array<{ src: string }>;
  product_type: string;
  tags: string[];
}

interface SearchResponse {
  resources: {
    results: {
      products: Array<{
        id: number;
        title: string;
        handle: string;
        price: string;
        available: boolean;
        image: string;
        url: string;
      }>;
    };
  };
}

const COLORS = ['red', 'yellow', 'blue'];

/**
 * Strip color suffix (Red/Yellow/Blue) from card name for search queries.
 * FAB stores often don't include pitch color in product titles.
 */
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
 * Search ActionPoint using Shopify predictive search API
 */
async function searchProducts(cardName: string): Promise<Array<{ handle: string; title: string }>> {
  // Strip color suffix for search — stores don't include pitch color in titles
  const { baseName } = stripColorSuffix(cardName);
  const query = encodeURIComponent(baseName);
  const predictiveUrl = `${BASE_URL}/search/suggest.json?q=${query}&resources[type]=product&resources[limit]=10`;

  try {
    const res = await fetch(predictiveUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (res.ok) {
      const data: SearchResponse = await res.json();
      if (data.resources?.results?.products?.length > 0) {
        return data.resources.results.products.map(p => ({
          handle: p.handle,
          title: p.title,
        }));
      }
    }
  } catch {
    // Predictive search failed, try HTML search
  }

  // Fallback to HTML search
  const searchUrl = `${BASE_URL}/search?q=${query}&type=product`;
  const res = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html',
    },
  });

  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }

  const html = await res.text();
  const handles: Array<{ handle: string; title: string }> = [];
  const seen = new Set<string>();

  const handleRegex = /href=["']\/products\/([^"'?#]+)["'][^>]*>([^<]*)/gi;
  let match;
  while ((match = handleRegex.exec(html)) !== null) {
    const handle = match[1];
    if (!seen.has(handle)) {
      seen.add(handle);
      handles.push({ handle, title: match[2] || handle });
    }
  }

  const dataRegex = /data-product-handle=["']([^"']+)["']/gi;
  while ((match = dataRegex.exec(html)) !== null) {
    const handle = match[1];
    if (!seen.has(handle)) {
      seen.add(handle);
      handles.push({ handle, title: handle });
    }
  }

  return handles;
}

/**
 * Fetch product data using Shopify JSON endpoint
 */
async function fetchProduct(handle: string): Promise<ShopifyProduct | null> {
  const url = `${BASE_URL}/products/${handle}.json`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
  });

  if (!res.ok) return null;

  try {
    const data = await res.json();
    return data.product as ShopifyProduct;
  } catch {
    return null;
  }
}

function normalizeForMatch(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim();
}

/**
 * Match card name against product title.
 * Handles the case where the user query includes a pitch color (Red/Yellow/Blue)
 * but the product title does not (common for Majestic+ rarity cards).
 */
function matchesCardName(productTitle: string, userCardName: string): boolean {
  const productNorm = normalizeForMatch(productTitle);
  const userNorm = normalizeForMatch(userCardName);

  if (productNorm.includes(userNorm)) return true;

  // Check color suffix: if user says "Enlightened Strike Red" but product is
  // "Enlightened Strike [WTR - WTR159]", match on the base name alone
  for (const color of COLORS) {
    if (userNorm.endsWith(` ${color}`)) {
      const baseName = userNorm.slice(0, -(color.length + 1));
      // Accept match if base name matches, regardless of whether color appears in product
      if (productNorm.includes(baseName)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Detect foil type from variant option strings.
 * ActionPoint uses multi-variant products where foil type is in variant options.
 */
function detectFoilFromVariant(variant: ShopifyVariant): FoilType | null {
  const text = [variant.title, variant.option1, variant.option2, variant.option3]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (text.includes('marvel')) return 'Marvel';
  if (text.includes('extended art') && (text.includes('rainbow') || text.includes('foil'))) return 'EARF';
  if (text.includes('cold foil')) return 'CF';
  if (text.includes('rainbow foil')) return 'RF';
  if (text.includes('normal') || text.includes('non-foil') || text.includes('non foil')) return 'NF';

  return null;
}

function detectFoilType(title: string, tags: string[] = []): FoilType | null {
  const tl = title.toLowerCase();
  const allTags = tags.join(' ').toLowerCase();

  if (tl.includes('marvel') || allTags.includes('marvel')) return 'Marvel';

  if ((tl.includes('extended art') || tl.includes('ea ') || allTags.includes('extended')) &&
      (tl.includes('rainbow') || tl.includes('foil'))) {
    return 'EARF';
  }

  if (tl.includes('cold foil') || allTags.includes('cold foil')) {
    return 'CF';
  }

  if (tl.includes('rainbow foil') || allTags.includes('rainbow foil') || allTags.includes('rainbow')) {
    return 'RF';
  }

  if (tl.includes('normal') || tl.includes('non-foil') || tl.includes('nf') ||
      allTags.includes('normal') || allTags.includes('non-foil')) {
    return 'NF';
  }

  // Default to NF if no foil indicator
  if (!tl.includes('foil')) {
    return 'NF';
  }

  return null;
}

/**
 * Find the NM variant matching the requested foil type.
 * ActionPoint uses multi-variant products with foil type in variant options
 * (e.g., "Near Mint / English / Unlimited Edition Rainbow Foil").
 */
function extractPriceForFoil(
  variants: ShopifyVariant[],
  foilType: FoilType
): { price: number | null; available: boolean } {
  // First, try to find a variant that matches both foil type and NM condition
  for (const v of variants) {
    const variantFoil = detectFoilFromVariant(v);
    if (variantFoil !== foilType) continue;

    const t = (v.title + ' ' + (v.option1 || '')).toLowerCase();
    const isNM = t.includes('near mint') || t.includes('nm') || t === 'default title';
    if (isNM) {
      const priceNum = parseFloat(v.price);
      return { price: isNaN(priceNum) ? null : priceNum, available: v.available };
    }
  }

  // If no NM+foil match, find any variant with matching foil type
  for (const v of variants) {
    const variantFoil = detectFoilFromVariant(v);
    if (variantFoil === foilType) {
      const priceNum = parseFloat(v.price);
      return { price: isNaN(priceNum) ? null : priceNum, available: v.available };
    }
  }

  return { price: null, available: false };
}

function extractNMPrice(variants: ShopifyVariant[]): { price: number | null; available: boolean } {
  const nmVariant = variants.find(v => {
    const t = (v.title + ' ' + (v.option1 || '')).toLowerCase();
    return t.includes('near mint') || t.includes('nm') || t === 'default title';
  });

  if (nmVariant) {
    const priceNum = parseFloat(nmVariant.price);
    return {
      price: isNaN(priceNum) ? null : priceNum,
      available: nmVariant.available,
    };
  }

  if (variants.length > 0) {
    const priceNum = parseFloat(variants[0].price);
    return {
      price: isNaN(priceNum) ? null : priceNum,
      available: variants[0].available,
    };
  }

  return { price: null, available: false };
}

function extractSetCode(title: string): string | null {
  // Match patterns like [WTR - WTR159] or [WTR159] or (WTR159)
  const fullMatch = title.match(/\[(?:[A-Z]+\s*-\s*)?([A-Z]{2,5}\d+)\]/i);
  if (fullMatch) return fullMatch[1].toUpperCase();

  const simpleMatch = title.match(/[\[\(]([A-Z]{2,5}\d+)[\]\)]/i);
  return simpleMatch ? simpleMatch[1].toUpperCase() : null;
}

export const actionpointAdapter: PriceSourceAdapter = {
  id: 'actionpoint',
  name: 'ActionPoint',
  currency: 'SGD',
  region: 'Singapore',
  rateLimit: 500,

  async searchCard(card: ExtendedParsedCard): Promise<SourcePrice> {
    try {
      const searchResults = await searchProducts(card.cardName);

      if (searchResults.length === 0) {
        return {
          source: 'actionpoint',
          currency: 'SGD',
          price: null,
          priceJPY: null,
          available: false,
          productUrl: '',
          setCode: null,
          error: 'No results found',
        };
      }

      for (const result of searchResults.slice(0, 15)) {
        const product = await fetchProduct(result.handle);
        if (!product) continue;

        if (!matchesCardName(product.title, card.cardName)) continue;

        // Check if this is a multi-variant product (foil types in variants)
        const hasVariantFoils = product.variants.some(v => detectFoilFromVariant(v) !== null);

        if (hasVariantFoils) {
          // Multi-variant: find the specific variant matching the requested foil type
          const { price, available } = extractPriceForFoil(product.variants, card.foilType);
          if (price === null) continue; // This product doesn't have the requested foil type

          const setCode = extractSetCode(product.title);
          return {
            source: 'actionpoint',
            currency: 'SGD',
            price,
            priceJPY: price ? convertToJPY(price, 'SGD') : null,
            available,
            productUrl: `${BASE_URL}/products/${product.handle}`,
            setCode,
          };
        } else {
          // Single-variant or no foil info in variants: detect from product title/tags
          const detectedFoil = detectFoilType(product.title, product.tags);
          if (detectedFoil !== card.foilType) continue;

          const { price, available } = extractNMPrice(product.variants);
          const setCode = extractSetCode(product.title);

          return {
            source: 'actionpoint',
            currency: 'SGD',
            price,
            priceJPY: price ? convertToJPY(price, 'SGD') : null,
            available,
            productUrl: `${BASE_URL}/products/${product.handle}`,
            setCode,
          };
        }
      }

      return {
        source: 'actionpoint',
        currency: 'SGD',
        price: null,
        priceJPY: null,
        available: false,
        productUrl: '',
        setCode: null,
        error: `No ${card.foilType} version found`,
      };
    } catch (err) {
      return {
        source: 'actionpoint',
        currency: 'SGD',
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
