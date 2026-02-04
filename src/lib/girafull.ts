import * as cheerio from 'cheerio';
import { FoilType, ParsedCard, CardSearchResult } from './types';

const BASE_URL = 'https://ec.girafull.co.jp';

interface ProductHandle {
  handle: string;
  title: string;
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

// Phase 1: Search Girafull for product handles
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
  const $ = cheerio.load(html);
  const handles: ProductHandle[] = [];

  // Extract product links from search results
  $('a[href*="/products/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      const match = href.match(/\/products\/([^?#]+)/);
      if (match) {
        const handle = match[1];
        const title = $(el).text().trim() || handle;
        // Avoid duplicates
        if (!handles.find(h => h.handle === handle)) {
          handles.push({ handle, title });
        }
      }
    }
  });

  return handles;
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
    return await res.json();
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
      // Non-foil: handle contains _foils_ (standard), no RF/CF prefix in title
      return h.includes('_foils_') && !t.includes('〈RF〉') && !t.includes('〈CF〉');
    case 'RF':
      // Rainbow foil: handle contains _foilr_, title has 〈RF〉, but NOT Extended Art
      return (h.includes('_foilr_') && t.includes('〈RF〉') && !t.toLowerCase().includes('extended art'));
    case 'CF':
      // Cold foil: handle contains _foilc_, title has 〈CF〉
      return h.includes('_foilc_') && t.includes('〈CF〉');
    case 'EARF':
      // Extended Art Rainbow Foil: has _foilr_ and _artea_ or Extended Art in title
      return (h.includes('_foilr_') && (h.includes('_artea_') || t.toLowerCase().includes('extended art')) && t.includes('〈RF〉'));
    case 'Marvel':
      // Marvel: identified by rarity_V tag
      return tags.some(tag => tag.toLowerCase().includes('rarity_v'));
    default:
      return false;
  }
}

// Extract the English card name from a product title
function extractEnglishName(title: string): string {
  // Remove 【EN】 prefix
  let name = title.replace(/【EN】/g, '');
  // Remove foil prefixes
  name = name.replace(/〈[A-Z]+〉\s*/g, '');
  // Remove Extended Art prefix
  name = name.replace(/Extended Art\s*/i, '');
  // Take text before "/" separator (English name before Japanese)
  const slashIndex = name.indexOf('/');
  if (slashIndex !== -1) {
    name = name.substring(0, slashIndex);
  }
  return name.trim();
}

// Normalize color in card name for matching: "Red" -> "(Red)"
function normalizeForMatch(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

// Check if the product title matches the user's card name
function matchesCardName(productTitle: string, userCardName: string): boolean {
  const productName = normalizeForMatch(extractEnglishName(productTitle));
  const userNormalized = normalizeForMatch(userCardName);

  // Direct substring match
  if (productName.includes(userNormalized)) return true;

  // Handle color in parentheses: user types "Take the Bait Red", title has "Take the Bait (Red)"
  // Try converting "Name Color" -> "Name (Color)"
  const colors = ['red', 'yellow', 'blue'];
  for (const color of colors) {
    if (userNormalized.endsWith(` ${color}`)) {
      const baseName = userNormalized.slice(0, -(color.length + 1));
      const withParens = `${baseName} (${color})`;
      if (productName.includes(withParens)) return true;
    }
  }

  return false;
}

// Extract NM price from variants
// Girafull sets price to 0 for sold-out grades; available field may not exist in JSON
function extractNMPrice(variants: ProductVariant[]): { price: number | null; available: boolean } {
  // Look for NM or Near Mint variant
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

  // If no NM-specific variant, use the first variant
  if (variants.length > 0) {
    const price = parseInt(variants[0].price, 10);
    return {
      price,
      available: variants[0].available ?? price > 0,
    };
  }

  return { price: null, available: false };
}

// Extract set code from tags
function extractSetCode(tags: string[]): string | null {
  for (const tag of tags) {
    // Set codes look like: set_XXX
    const match = tag.match(/^set_(.+)/i);
    if (match) return match[1].toUpperCase();
  }
  return null;
}

// Main search function for a single card
export async function searchCard(card: ParsedCard): Promise<CardSearchResult> {
  try {
    // Phase 1: Search for products
    const handles = await searchProducts(card.cardName);

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

    // Phase 2: Check each product for foil type and name match
    for (const handle of handles) {
      const productData = await fetchProductJSON(handle.handle);
      if (!productData) continue;

      const product = productData.product;

      // Check foil type match
      if (!matchesFoilType(product.handle, product.title, product.tags, card.foilType)) {
        continue;
      }

      // Check card name match
      if (!matchesCardName(product.title, card.cardName)) {
        continue;
      }

      // Found a match
      const { price, available } = extractNMPrice(product.variants);
      const imageUrl = product.images.length > 0 ? product.images[0].src : null;
      const setCode = extractSetCode(product.tags);

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

    // No matching product found
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
