import { SourcePrice, FoilType } from '../types';
import { PriceSourceAdapter, ExtendedParsedCard } from './types';
import { convertToJPY } from '../currency';

const BASE_URL = 'https://starcitygames.com';

interface SCGProduct {
  name: string;
  price: number | null;
  url: string;
  available: boolean;
  sku?: string;
}

/**
 * Convert a card name to SCG URL slug format
 * e.g., "A Good Clean Fight" -> "a-good-clean-fight"
 */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Get SKU suffix based on foil type
 * SCG SKU pattern: SGL-FAB-{SET}-{NUM}-{LANG}{FOIL}
 * - ENN = English Normal
 * - ENF = English Foil (Rainbow)
 * - ENC = English Cold Foil
 */
function getSkuSuffix(foilType: FoilType): string {
  switch (foilType) {
    case 'NF':
      return 'enn';
    case 'RF':
    case 'EARF':
      return 'enf';
    case 'CF':
      return 'enc';
    case 'Marvel':
      return 'enf';
    default:
      return 'enn';
  }
}

/**
 * Fetch product page and extract data from JSON-LD
 */
async function fetchProductPage(url: string): Promise<SCGProduct | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Extract JSON-LD data
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      try {
        const data = JSON.parse(jsonLdMatch[1]);
        const items = data['@graph'] || (Array.isArray(data) ? data : [data]);

        for (const item of items) {
          if (item['@type'] === 'Product' && item.offers) {
            const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
            return {
              name: item.name || '',
              price: offers.price ? parseFloat(offers.price) : null,
              url,
              available: offers.availability?.includes('InStock') || false,
              sku: item.sku,
            };
          }
        }
      } catch {
        // JSON parse failed
      }
    }

    // Fallback: extract from meta tags and HTML
    const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const priceMatch = html.match(/\$\s*([\d,.]+)/);
    const inStock = html.toLowerCase().includes('in stock') || html.includes('"availability":"InStock"');

    if (titleMatch) {
      return {
        name: titleMatch[1],
        price: priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null,
        url,
        available: inStock,
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

  // Check if first significant words match
  const userWords = userNorm.split(' ').filter(w => w.length > 2);
  const matchCount = userWords.filter(w => productNorm.includes(w)).length;
  if (matchCount >= Math.ceil(userWords.length * 0.7)) return true;

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

function detectFoilType(title: string, sku?: string): FoilType | null {
  const skuLower = (sku || '').toLowerCase();

  // Check SKU patterns first (most reliable)
  if (skuLower.includes('-enc') || skuLower.endsWith('c1')) return 'CF';
  if (skuLower.includes('-enf') || skuLower.endsWith('f1')) return 'RF';
  if (skuLower.includes('-enn') || skuLower.endsWith('n1')) return 'NF';

  const tl = title.toLowerCase();
  if (tl.includes('marvel')) return 'Marvel';
  if (tl.includes('extended art')) return 'EARF';
  if (tl.includes('cold foil')) return 'CF';
  if (tl.includes('rainbow foil') || tl.includes('foil')) return 'RF';

  return 'NF';
}

function extractSetCode(sku?: string): string | null {
  if (sku) {
    const skuMatch = sku.match(/FAB-([A-Z]+)-(\d+)/i);
    if (skuMatch) {
      return `${skuMatch[1]}${skuMatch[2]}`.toUpperCase();
    }
  }
  return null;
}

export const starcitygamesAdapter: PriceSourceAdapter = {
  id: 'starcitygames',
  name: 'StarCityGames',
  currency: 'USD',
  region: 'USA',
  rateLimit: 300,

  async searchCard(card: ExtendedParsedCard): Promise<SourcePrice> {
    try {
      const slug = toSlug(card.cardName);
      const suffix = getSkuSuffix(card.foilType);

      // If we have a set code from Girafull (e.g., "SUP021"), use it directly
      if (card.setCode) {
        const match = card.setCode.match(/^([A-Z]+)(\d+)$/i);
        if (match) {
          const set = match[1].toLowerCase();
          const num = match[2].padStart(3, '0');
          const url = `${BASE_URL}/${slug}-sgl-fab-${set}-${num}-${suffix}/`;

          const product = await fetchProductPage(url);

          if (product && matchesCardName(product.name, card.cardName)) {
            const detectedFoil = detectFoilType(product.name, product.sku);

            if (detectedFoil === card.foilType) {
              return {
                source: 'starcitygames',
                currency: 'USD',
                price: product.price,
                priceJPY: product.price ? convertToJPY(product.price, 'USD') : null,
                available: product.available,
                productUrl: url,
                setCode: extractSetCode(product.sku) || card.setCode,
              };
            }
          }
        }
      }

      // Without a set code, we can't reliably find the card on SCG
      // Their search requires JavaScript, so we need the set code
      return {
        source: 'starcitygames',
        currency: 'USD',
        price: null,
        priceJPY: null,
        available: false,
        productUrl: '',
        setCode: null,
        error: card.setCode ? `No ${card.foilType} version found` : 'Set code required',
      };
    } catch (err) {
      return {
        source: 'starcitygames',
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
