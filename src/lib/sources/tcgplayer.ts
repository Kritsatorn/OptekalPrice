import { SourcePrice, FoilType } from '../types';
import { PriceSourceAdapter, ExtendedParsedCard } from './types';
import { convertToJPY } from '../currency';

const BASE_URL = 'https://www.tcgplayer.com';

interface TCGProduct {
  name: string;
  price: number | null;
  url: string;
  available: boolean;
  setName?: string;
}

/**
 * Search TCGPlayer for Flesh and Blood products
 */
async function searchProducts(cardName: string): Promise<TCGProduct[]> {
  // TCGPlayer search URL for Flesh and Blood
  const query = encodeURIComponent(cardName);
  const url = `${BASE_URL}/search/flesh-and-blood/product?q=${query}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  });

  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }

  const html = await res.text();
  const products: TCGProduct[] = [];

  // TCGPlayer embeds product data in JSON-LD or data attributes
  // Try JSON-LD first
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (item['@type'] === 'Product' && item.offers) {
          const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          products.push({
            name: item.name || '',
            price: offers.price ? parseFloat(offers.price) : null,
            url: item.url || '',
            available: offers.availability?.includes('InStock') || true,
          });
        }
      }
    } catch {
      // Skip invalid JSON
    }
  }

  // Parse search results from HTML
  // TCGPlayer uses React so data may be in __NEXT_DATA__ or similar
  const nextDataMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const results = nextData?.props?.pageProps?.results ||
                      nextData?.props?.pageProps?.searchResults ||
                      [];

      for (const result of results) {
        if (result.productName || result.name) {
          products.push({
            name: result.productName || result.name,
            price: result.marketPrice || result.lowestPrice || result.price || null,
            url: result.url || result.productUrl || `${BASE_URL}/product/${result.productId}`,
            available: result.totalListings > 0 || true,
            setName: result.setName,
          });
        }
      }
    } catch {
      // Continue to HTML parsing
    }
  }

  // Fallback: extract from HTML patterns
  // Look for product cards with prices
  const productRegex = /data-testid=["']search-result["'][^>]*>[\s\S]*?href=["']([^"']+)["'][^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>[\s\S]*?\$([\d,.]+)/gi;

  while ((match = productRegex.exec(html)) !== null) {
    const url = match[1];
    const name = match[2].trim();
    const price = parseFloat(match[3].replace(/,/g, ''));

    if (url && name && !products.some(p => p.name === name)) {
      products.push({
        name,
        price: isNaN(price) ? null : price,
        url: url.startsWith('http') ? url : `${BASE_URL}${url}`,
        available: true,
      });
    }
  }

  // Also try simpler link + price extraction
  const linkPriceRegex = /href=["'](\/product\/[^"']+)["'][^>]*title=["']([^"']+)["'][\s\S]*?\$([\d,.]+)/gi;
  while ((match = linkPriceRegex.exec(html)) !== null) {
    const url = `${BASE_URL}${match[1]}`;
    const name = match[2];
    const price = parseFloat(match[3].replace(/,/g, ''));

    if (!products.some(p => p.url === url)) {
      products.push({
        name,
        price: isNaN(price) ? null : price,
        url,
        available: true,
      });
    }
  }

  return products;
}

/**
 * Fetch individual product page for more details
 */
async function fetchProductPage(url: string): Promise<TCGProduct | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Try to extract from JSON-LD
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      try {
        const data = JSON.parse(jsonLdMatch[1]);
        const items = Array.isArray(data) ? data : [data];

        for (const item of items) {
          if (item['@type'] === 'Product' && item.offers) {
            const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
            return {
              name: item.name || '',
              price: offers.price ? parseFloat(offers.price) : null,
              url,
              available: offers.availability?.includes('InStock') || true,
            };
          }
        }
      } catch {
        // Continue to fallback
      }
    }

    // Try __NEXT_DATA__
    const nextDataMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const product = nextData?.props?.pageProps?.product;

        if (product) {
          return {
            name: product.productName || product.name,
            price: product.marketPrice || product.lowestPrice || null,
            url,
            available: (product.totalListings || 0) > 0,
          };
        }
      } catch {
        // Continue to fallback
      }
    }

    // Fallback: extract from meta tags
    const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const priceMatch = html.match(/Market Price[^$]*\$([\d,.]+)/i) ||
                       html.match(/Low[^$]*\$([\d,.]+)/i) ||
                       html.match(/\$([\d,.]+)/);

    if (titleMatch) {
      return {
        name: titleMatch[1],
        price: priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null,
        url,
        available: !html.toLowerCase().includes('out of stock'),
      };
    }

    return null;
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

function detectFoilType(title: string): FoilType | null {
  const tl = title.toLowerCase();

  if (tl.includes('marvel')) return 'Marvel';

  if (tl.includes('extended art')) {
    return 'EARF';
  }

  if (tl.includes('cold foil')) {
    return 'CF';
  }

  if (tl.includes('rainbow foil') || (tl.includes('foil') && !tl.includes('non-foil') && !tl.includes('cold'))) {
    return 'RF';
  }

  if (tl.includes('non-foil') || tl.includes('normal')) {
    return 'NF';
  }

  // Default to NF if no foil indicator
  if (!tl.includes('foil')) {
    return 'NF';
  }

  return null;
}

function extractSetCode(title: string): string | null {
  const match = title.match(/[\[\(]([A-Z]{2,5}\d+)[\]\)]/i);
  return match ? match[1].toUpperCase() : null;
}

export const tcgplayerAdapter: PriceSourceAdapter = {
  id: 'tcgplayer',
  name: 'TCGplayer',
  currency: 'USD',
  region: 'USA',
  rateLimit: 800,

  async searchCard(card: ExtendedParsedCard): Promise<SourcePrice> {
    try {
      const products = await searchProducts(card.cardName);

      for (const product of products) {
        if (!matchesCardName(product.name, card.cardName)) continue;

        const detectedFoil = detectFoilType(product.name);
        if (detectedFoil !== card.foilType) continue;

        // If no price, try fetching the product page
        let finalProduct = product;
        if (product.price === null && product.url) {
          const fetched = await fetchProductPage(product.url);
          if (fetched) finalProduct = fetched;
        }

        const setCode = extractSetCode(finalProduct.name);

        return {
          source: 'tcgplayer',
          currency: 'USD',
          price: finalProduct.price,
          priceJPY: finalProduct.price ? convertToJPY(finalProduct.price, 'USD') : null,
          available: finalProduct.available,
          productUrl: finalProduct.url.startsWith('http') ? finalProduct.url : `${BASE_URL}${finalProduct.url}`,
          setCode,
        };
      }

      return {
        source: 'tcgplayer',
        currency: 'USD',
        price: null,
        priceJPY: null,
        available: false,
        productUrl: '',
        setCode: null,
        error: `No ${card.foilType} version found`,
      };
    } catch (err) {
      return {
        source: 'tcgplayer',
        currency: 'USD',
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
