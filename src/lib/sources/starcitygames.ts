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

function detectFoilType(title: string, sku?: string): FoilType {
  const skuLower = (sku || '').toLowerCase();

  // Check SKU patterns (most reliable)
  // SCG uses: ENN=Normal, ENR=Rainbow Foil, ENC=Cold Foil
  if (skuLower.includes('-enc') || skuLower.endsWith('c1')) return 'CF';
  if (skuLower.includes('-enr') || skuLower.endsWith('r1')) return 'RF';
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
    // Match patterns like SGL-FAB-WTRU-159-ENN or SGL-FAB-WTR1-159-ENR
    const skuMatch = sku.match(/FAB-([A-Z0-9]+)-(\d+)/i);
    if (skuMatch) {
      // Strip edition suffixes: WTRU -> WTR, WTR1 -> WTR
      const rawSet = skuMatch[1].toUpperCase();
      const setBase = rawSet.replace(/[U1]$/i, '');
      return `${setBase}${skuMatch[2]}`;
    }
  }
  return null;
}

// Cache the storefront token (expires every ~2 days)
let cachedToken: string | null = null;
let tokenFetchedAt = 0;
const TOKEN_TTL = 60 * 60 * 1000; // Refresh every 1 hour

/**
 * Extract the BigCommerce storefront token from any SCG page.
 * This token is embedded in the HTML on every page load.
 */
async function getStorefrontToken(): Promise<string | null> {
  if (cachedToken && Date.now() - tokenFetchedAt < TOKEN_TTL) {
    return cachedToken;
  }

  try {
    const res = await fetch(BASE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Extract token - key is "StoreFrontToken" (escaped quotes in JSON)
    const match = html.match(/StoreFrontToken[\\"]+"?:?\s*[\\"]+(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/);
    if (match) {
      cachedToken = match[1];
      tokenFetchedAt = Date.now();
      return cachedToken;
    }

    // Fallback patterns
    const altMatch = html.match(/storefront[_-]?token['":\\:\s]+['"]?(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/i);
    if (altMatch) {
      cachedToken = altMatch[1];
      tokenFetchedAt = Date.now();
      return cachedToken;
    }

    return null;
  } catch {
    return null;
  }
}

const SEARCH_QUERY = `
  query SearchProducts($searchTerm: String!) {
    site {
      search {
        searchProducts(filters: { searchTerm: $searchTerm }) {
          products(first: 20) {
            edges {
              node {
                entityId
                name
                sku
                path
                prices {
                  price { value currencyCode }
                  salePrice { value currencyCode }
                }
                availabilityV2 {
                  status
                }
              }
            }
          }
        }
      }
    }
  }
`;

const PRODUCT_BY_SKU_QUERY = `
  query ProductBySKU($sku: String!) {
    site {
      product(sku: $sku) {
        entityId
        name
        sku
        path
        prices {
          price { value currencyCode }
          salePrice { value currencyCode }
        }
        availabilityV2 {
          status
        }
      }
    }
  }
`;

interface GraphQLProduct {
  entityId: number;
  name: string;
  sku: string;
  path: string;
  prices: {
    price: { value: number; currencyCode: string } | null;
    salePrice: { value: number; currencyCode: string } | null;
  } | null;
  availabilityV2: {
    status: string;
  } | null;
}

/** Foil suffix map for building SCG SKUs */
const FOIL_SKU_SUFFIX: Record<string, string> = {
  NF: 'ENN',
  RF: 'ENR',
  CF: 'ENC',
};

/**
 * Parse a set code like "PEN070" into { set: "PEN", number: "070" }.
 */
function parseSetCode(setCode: string): { set: string; number: string } | null {
  const m = setCode.match(/^([A-Z]{2,5})(\d+)$/i);
  if (!m) return null;
  return { set: m[1].toUpperCase(), number: m[2] };
}

/**
 * Build possible SCG SKUs from a set code and foil type.
 * e.g. setCode "PEN070", foilType "NF" → "SGL-FAB-PEN-070-ENN1"
 */
function buildSCGSKUs(setCode: string, foilType: FoilType): string[] {
  const parsed = parseSetCode(setCode);
  if (!parsed) return [];

  const suffix = FOIL_SKU_SUFFIX[foilType];
  if (!suffix) return [];

  // Pad number to 3 digits
  const num = parsed.number.padStart(3, '0');

  return [
    `SGL-FAB-${parsed.set}-${num}-${suffix}1`,
  ];
}

function mapGraphQLProduct(p: GraphQLProduct): SCGProduct {
  const price = p.prices?.salePrice?.value ?? p.prices?.price?.value ?? null;
  const available = p.availabilityV2?.status === 'Available';
  return {
    name: p.name,
    price,
    url: `${BASE_URL}${p.path}`,
    available,
    sku: p.sku,
  };
}

async function graphqlFetch(token: string, query: string, variables: Record<string, string>): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Origin': 'https://starcitygames.com',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Search SCG using their BigCommerce GraphQL Storefront API.
 * Uses name-based search first, then falls back to SKU-based lookup.
 */
async function searchProducts(cardName: string, setCode?: string, foilType?: FoilType): Promise<SCGProduct[]> {
  const token = await getStorefrontToken();
  if (!token) return [];

  const { baseName } = stripColorSuffix(cardName);

  try {
    // 1) Try name-based search
    const data = await graphqlFetch(token, SEARCH_QUERY, { searchTerm: baseName }) as { data?: { site?: { search?: { searchProducts?: { products?: { edges?: Array<{ node: GraphQLProduct }> } } } } } } | null;
    const edges = data?.data?.site?.search?.searchProducts?.products?.edges;
    if (edges && edges.length > 0) {
      return edges.map((edge) => mapGraphQLProduct(edge.node));
    }

    // 2) Fallback: look up by constructed SKU when we have a set code
    if (setCode && foilType) {
      const skus = buildSCGSKUs(setCode, foilType);
      for (const sku of skus) {
        const skuData = await graphqlFetch(token, PRODUCT_BY_SKU_QUERY, { sku }) as { data?: { site?: { product?: GraphQLProduct | null } } } | null;
        const product = skuData?.data?.site?.product;
        if (product) {
          return [mapGraphQLProduct(product)];
        }
      }

      // 3) Fallback: search by SKU prefix (without foil+edition suffix)
      const parsed = parseSetCode(setCode);
      if (parsed) {
        const skuPrefix = `SGL-FAB-${parsed.set}-${parsed.number.padStart(3, '0')}`;
        const skuSearchData = await graphqlFetch(token, SEARCH_QUERY, { searchTerm: skuPrefix }) as { data?: { site?: { search?: { searchProducts?: { products?: { edges?: Array<{ node: GraphQLProduct }> } } } } } } | null;
        const skuEdges = skuSearchData?.data?.site?.search?.searchProducts?.products?.edges;
        if (skuEdges && skuEdges.length > 0) {
          return skuEdges.map((edge) => mapGraphQLProduct(edge.node));
        }
      }
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Check if a product name matches the FAB card we're looking for.
 * SCG product names for FAB look like:
 * "Enlightened Strike [SGL-FAB-WTRU-159-ENN1]"
 * "Enlightened Strike (Rainbow Foil) [SGL-FAB-WTRU-159-ENR1]"
 */
function isFabProduct(product: SCGProduct): boolean {
  const sku = (product.sku || '').toLowerCase();
  const name = product.name.toLowerCase();
  return sku.includes('fab') || name.includes('flesh') || name.includes('sgl-fab');
}

export const starcitygamesAdapter: PriceSourceAdapter = {
  id: 'starcitygames',
  name: 'StarCityGames',
  currency: 'USD',
  region: 'USA',
  rateLimit: 300,

  async searchCard(card: ExtendedParsedCard): Promise<SourcePrice> {
    try {
      const products = await searchProducts(card.cardName, card.setCode, card.foilType);

      if (products.length === 0) {
        return {
          source: 'starcitygames',
          currency: 'USD',
          price: null,
          priceJPY: null,
          available: false,
          productUrl: '',
          setCode: null,
          error: 'No results found',
        };
      }

      // Filter to FAB products only first
      const fabProducts = products.filter(p => isFabProduct(p));
      const searchPool = fabProducts.length > 0 ? fabProducts : products;

      // Find the best matching product with correct foil type
      for (const product of searchPool) {
        if (!matchesCardName(product.name, card.cardName)) continue;

        const detectedFoil = detectFoilType(product.name, product.sku);
        if (detectedFoil !== card.foilType) continue;

        // If we have a set code, prefer matching set
        const productSetCode = extractSetCode(product.sku);
        if (card.setCode && productSetCode) {
          // Strip numbers for set comparison (WTR159 -> WTR)
          const cardSet = card.setCode.replace(/\d+/g, '').toUpperCase();
          const prodSet = productSetCode.replace(/\d+/g, '').toUpperCase();
          if (cardSet !== prodSet) continue;
        }

        return {
          source: 'starcitygames',
          currency: 'USD',
          price: product.price,
          priceJPY: product.price ? convertToJPY(product.price, 'USD') : null,
          available: product.available,
          productUrl: product.url,
          setCode: productSetCode || card.setCode || null,
        };
      }

      // Fallback: match name and foil without set restriction
      for (const product of searchPool) {
        if (!matchesCardName(product.name, card.cardName)) continue;

        const detectedFoil = detectFoilType(product.name, product.sku);
        if (detectedFoil !== card.foilType) continue;

        return {
          source: 'starcitygames',
          currency: 'USD',
          price: product.price,
          priceJPY: product.price ? convertToJPY(product.price, 'USD') : null,
          available: product.available,
          productUrl: product.url,
          setCode: extractSetCode(product.sku) || card.setCode || null,
        };
      }

      return {
        source: 'starcitygames',
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
