import { SourcePrice, FoilType } from '../types';
import { PriceSourceAdapter, ExtendedParsedCard } from './types';
import { convertToJPY } from '../currency';

const SEARCH_API_URL = 'https://mp-search-api.tcgplayer.com/v1/search/request';

const COLORS = ['red', 'yellow', 'blue'];

interface TCGListing {
  price: number;
  condition: string;
  printing: string;
  language: string;
  quantity: number;
  shippingPrice: number;
}

interface TCGProductResult {
  productName: string;
  productId: number;
  setName: string;
  setUrlName: string;
  rarityName: string;
  marketPrice: number | null;
  lowestPrice: number | null;
  lowestPriceWithShipping: number | null;
  totalListings: number;
  productUrlName: string;
  productLineUrlName: string;
  customAttributes: {
    number?: string;
    pitchValue?: string;
    [key: string]: unknown;
  };
  listings: TCGListing[];
}

interface TCGSearchResponse {
  errors: string[];
  results: Array<{
    totalResults: number;
    results: TCGProductResult[];
  }>;
}

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
 * Search TCGPlayer using their search API (POST endpoint).
 * This is the only reliable way since TCGPlayer is a fully client-rendered SPA.
 */
async function searchProducts(cardName: string): Promise<TCGProductResult[]> {
  const { baseName } = stripColorSuffix(cardName);
  const url = `${SEARCH_API_URL}?q=${encodeURIComponent(baseName)}&isList=false`;

  const body = {
    algorithm: '',
    from: 0,
    size: 10,
    filters: {
      term: {
        productLineName: ['flesh-and-blood-tcg'],
      },
      range: {},
      match: {},
    },
    listingSearch: {
      filters: {
        term: {},
        range: {},
        exclude: {
          channelExclusion: 0,
        },
      },
    },
    context: {
      cart: {},
      shippingCountry: 'US',
    },
    settings: {
      useFuzzySearch: true,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`TCGPlayer search failed: ${res.status}`);
  }

  const data: TCGSearchResponse = await res.json();

  if (data.errors?.length > 0) {
    throw new Error(`TCGPlayer API error: ${data.errors[0]}`);
  }

  return data.results?.[0]?.results || [];
}

function normalizeForMatch(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim();
}

function matchesCardName(productName: string, userCardName: string): boolean {
  const productNorm = normalizeForMatch(productName);
  const userNorm = normalizeForMatch(userCardName);

  if (productNorm.includes(userNorm)) return true;

  // Check with color stripped
  for (const color of COLORS) {
    if (userNorm.endsWith(` ${color}`)) {
      const baseName = userNorm.slice(0, -(color.length + 1));
      if (productNorm.includes(baseName)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Detect foil type from a TCGPlayer printing string.
 * Printings look like: "Unlimited Edition Normal", "Unlimited Edition Rainbow Foil",
 * "1st Edition Cold Foil", "Alpha Print Normal", etc.
 */
function detectFoilFromPrinting(printing: string): FoilType {
  const pl = printing.toLowerCase();

  if (pl.includes('marvel')) return 'Marvel';
  if (pl.includes('extended art') && (pl.includes('rainbow') || pl.includes('foil'))) return 'EARF';
  if (pl.includes('cold foil')) return 'CF';
  if (pl.includes('rainbow foil')) return 'RF';
  if (pl.includes('normal') || pl.includes('non-foil')) return 'NF';

  // Default: if no "foil" keyword, assume NF
  if (!pl.includes('foil')) return 'NF';

  return 'RF'; // Generic "foil" without cold/rainbow -> RF
}

/**
 * Find the best NM listing for the requested foil type from TCGPlayer listings.
 */
function findBestListing(
  listings: TCGListing[],
  foilType: FoilType
): { price: number | null; available: boolean } {
  // Filter listings that match the foil type and are NM
  const matchingListings = listings.filter(l => {
    const listingFoil = detectFoilFromPrinting(l.printing);
    const isNM = l.condition.toLowerCase().includes('near mint');
    return listingFoil === foilType && isNM && l.quantity > 0;
  });

  if (matchingListings.length > 0) {
    // Sort by price and return cheapest
    matchingListings.sort((a, b) => a.price - b.price);
    return { price: matchingListings[0].price, available: true };
  }

  // Fallback: any listing matching foil type (regardless of condition)
  const anyFoilMatch = listings.filter(l => {
    return detectFoilFromPrinting(l.printing) === foilType && l.quantity > 0;
  });

  if (anyFoilMatch.length > 0) {
    anyFoilMatch.sort((a, b) => a.price - b.price);
    return { price: anyFoilMatch[0].price, available: true };
  }

  return { price: null, available: false };
}

/**
 * Check if a product has any listings matching the foil type.
 * If no listings, fall back to checking product name / printing info.
 */
function productHasFoilType(product: TCGProductResult, foilType: FoilType): boolean {
  // Check listings first (most reliable)
  if (product.listings && product.listings.length > 0) {
    return product.listings.some(l => detectFoilFromPrinting(l.printing) === foilType);
  }

  // Fallback: check product name
  const name = product.productName.toLowerCase();
  switch (foilType) {
    case 'NF':
      return !name.includes('foil') || name.includes('non-foil') || name.includes('normal');
    case 'RF':
      return name.includes('rainbow foil');
    case 'CF':
      return name.includes('cold foil');
    case 'EARF':
      return name.includes('extended art');
    case 'Marvel':
      return name.includes('marvel');
    default:
      return false;
  }
}

function buildProductUrl(product: TCGProductResult): string {
  const lineSlug = (product.productLineUrlName || 'flesh-and-blood-tcg')
    .toLowerCase().replace(/\s+/g, '-');
  const setSlug = (product.setUrlName || product.setName || '')
    .toLowerCase().replace(/\s+/g, '-');
  const nameSlug = (product.productUrlName || product.productName)
    .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return `https://www.tcgplayer.com/product/${product.productId}/${lineSlug}-${setSlug}-${nameSlug}`;
}

function extractSetCode(product: TCGProductResult): string | null {
  const number = product.customAttributes?.number;
  if (number && /^[A-Z]{2,5}\d+$/i.test(number)) {
    return number.toUpperCase();
  }
  return null;
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

      if (products.length === 0) {
        return {
          source: 'tcgplayer',
          currency: 'USD',
          price: null,
          priceJPY: null,
          available: false,
          productUrl: '',
          setCode: null,
          error: 'No results found',
        };
      }

      for (const product of products) {
        if (!matchesCardName(product.productName, card.cardName)) continue;
        if (!productHasFoilType(product, card.foilType)) continue;

        // Try to get price from listings (most accurate - NM price)
        let price: number | null = null;
        let available = false;

        if (product.listings && product.listings.length > 0) {
          const listing = findBestListing(product.listings, card.foilType);
          price = listing.price;
          available = listing.available;
        }

        // Fall back to market price if no matching listing found
        if (price === null && product.marketPrice) {
          price = product.marketPrice;
          available = product.totalListings > 0;
        }

        // Fall back to lowest price
        if (price === null && product.lowestPrice) {
          price = product.lowestPrice;
          available = product.totalListings > 0;
        }

        const setCode = extractSetCode(product);
        const productUrl = buildProductUrl(product);

        return {
          source: 'tcgplayer',
          currency: 'USD',
          price,
          priceJPY: price ? convertToJPY(price, 'USD') : null,
          available,
          productUrl,
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
