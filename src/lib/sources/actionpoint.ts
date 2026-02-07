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

/**
 * Search ActionPoint using Shopify predictive search API
 */
async function searchProducts(cardName: string): Promise<Array<{ handle: string; title: string }>> {
  // Try predictive search first
  const query = encodeURIComponent(cardName);
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

  // Extract product handles from search results
  const handleRegex = /href=["']\/products\/([^"'?#]+)["'][^>]*>([^<]*)/gi;
  let match;
  while ((match = handleRegex.exec(html)) !== null) {
    const handle = match[1];
    if (!seen.has(handle)) {
      seen.add(handle);
      handles.push({ handle, title: match[2] || handle });
    }
  }

  // Also look for data attributes
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

function matchesCardName(productTitle: string, userCardName: string): boolean {
  const productNorm = normalizeForMatch(productTitle);
  const userNorm = normalizeForMatch(userCardName);

  if (productNorm.includes(userNorm)) return true;

  const colors = ['red', 'yellow', 'blue'];
  for (const color of colors) {
    if (userNorm.endsWith(` ${color}`)) {
      const baseName = userNorm.slice(0, -(color.length + 1));
      if (productNorm.includes(baseName) && productNorm.includes(color)) {
        return true;
      }
    }
  }

  return false;
}

function detectFoilType(title: string, tags: string[] = []): FoilType | null {
  const tl = title.toLowerCase();
  const allTags = tags.join(' ').toLowerCase();

  if (tl.includes('marvel') || allTags.includes('marvel')) return 'Marvel';

  if ((tl.includes('extended art') || tl.includes('ea ') || allTags.includes('extended')) &&
      (tl.includes('rainbow') || tl.includes('foil'))) {
    return 'EARF';
  }

  if (tl.includes('cold foil') || tl.includes('cf') || allTags.includes('cold foil')) {
    return 'CF';
  }

  if (tl.includes('rainbow foil') || tl.includes('rf') || allTags.includes('rainbow')) {
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
  const match = title.match(/[\[\(]([A-Z]{2,5}\d+)[\]\)]/i);
  return match ? match[1].toUpperCase() : null;
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
