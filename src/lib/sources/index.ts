import { ParsedCard, PriceSource, SourcePrice } from '../types';
import { PriceSourceAdapter, ExtendedParsedCard } from './types';
import { girafullAdapter } from './girafull';
import { actionpointAdapter } from './actionpoint';
import { starcitygamesAdapter } from './starcitygames';
import { tcgplayerAdapter } from './tcgplayer';
import { findBestPrice } from '../currency';

// Registry of all available adapters
const adapters: Record<PriceSource, PriceSourceAdapter> = {
  girafull: girafullAdapter,
  actionpoint: actionpointAdapter,
  starcitygames: starcitygamesAdapter,
  tcgplayer: tcgplayerAdapter,
};

/**
 * Get an adapter by its source ID
 */
export function getAdapter(source: PriceSource): PriceSourceAdapter | undefined {
  return adapters[source];
}

/**
 * Get all available adapters
 */
export function getAllAdapters(): PriceSourceAdapter[] {
  return Object.values(adapters);
}

/**
 * Delay helper for rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Search a single source with timeout
 */
async function searchSourceWithTimeout(
  adapter: PriceSourceAdapter,
  card: ExtendedParsedCard,
  timeoutMs: number = 5000
): Promise<SourcePrice> {
  const timeoutPromise = new Promise<SourcePrice>((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), timeoutMs);
  });

  try {
    const result = await Promise.race([
      adapter.searchCard(card),
      timeoutPromise,
    ]);
    return result;
  } catch (err) {
    return {
      source: adapter.id,
      currency: adapter.currency,
      price: null,
      priceJPY: null,
      available: false,
      productUrl: '',
      setCode: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Search for a card across all enabled sources
 * Returns prices from each source, with errors isolated (one failure doesn't break others)
 * @param card - The parsed card to search for
 * @param enabledSources - List of source IDs to search
 * @param knownSetCode - Optional set code from primary search (helps other sources find the card)
 */
export async function searchCardAllSources(
  card: ParsedCard,
  enabledSources: PriceSource[],
  knownSetCode?: string
): Promise<{ sourcePrices: SourcePrice[]; bestSource: PriceSource | null }> {
  const sourcePrices: SourcePrice[] = [];

  // Extend card with known set code
  const extendedCard: ExtendedParsedCard = {
    ...card,
    setCode: knownSetCode,
  };

  // Search each source in parallel (with their own rate limits handled internally)
  const searchPromises = enabledSources.map(async (sourceId) => {
    const adapter = adapters[sourceId];
    if (!adapter) {
      return {
        source: sourceId,
        currency: 'JPY' as const,
        price: null,
        priceJPY: null,
        available: false,
        productUrl: '',
        setCode: null,
        error: 'Source not found',
      } as SourcePrice;
    }

    return searchSourceWithTimeout(adapter, extendedCard);
  });

  const results = await Promise.all(searchPromises);
  sourcePrices.push(...results);

  // Find the best price among all sources
  const bestSource = findBestPrice(sourcePrices);

  return { sourcePrices, bestSource };
}

/**
 * Search multiple cards across all enabled sources
 * Includes rate limiting between cards for each source
 */
export async function searchCardsAllSources(
  cards: ParsedCard[],
  enabledSources: PriceSource[]
): Promise<Array<{ sourcePrices: SourcePrice[]; bestSource: PriceSource | null }>> {
  const results: Array<{ sourcePrices: SourcePrice[]; bestSource: PriceSource | null }> = [];

  // Process cards sequentially with rate limiting
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const result = await searchCardAllSources(card, enabledSources);
    results.push(result);

    // Apply rate limiting between cards (use the highest rate limit among enabled sources)
    if (i < cards.length - 1) {
      const maxRateLimit = Math.max(
        ...enabledSources.map(s => adapters[s]?.rateLimit ?? 300)
      );
      await delay(maxRateLimit);
    }
  }

  return results;
}

// Re-export types and utilities
export type { PriceSourceAdapter, ExtendedParsedCard } from './types';
export { DEFAULT_SOURCE_CONFIGS } from './types';
export { girafullAdapter } from './girafull';
export { actionpointAdapter } from './actionpoint';
export { starcitygamesAdapter } from './starcitygames';
export { tcgplayerAdapter } from './tcgplayer';
