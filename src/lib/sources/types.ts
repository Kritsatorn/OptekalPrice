import { PriceSource, Currency, SourcePrice, ParsedCard } from '../types';

/**
 * Extended ParsedCard with optional setCode from primary search
 */
export interface ExtendedParsedCard extends ParsedCard {
  setCode?: string;
}

/**
 * Interface that all price source adapters must implement
 */
export interface PriceSourceAdapter {
  /** Unique identifier for this source */
  id: PriceSource;

  /** Display name for the source */
  name: string;

  /** Currency used by this source */
  currency: Currency;

  /** Region/country where this source operates */
  region: string;

  /** Delay in ms between requests to this source */
  rateLimit: number;

  /**
   * Search for a card and return pricing information
   * @param card The parsed card to search for (may include setCode from primary search)
   * @returns SourcePrice with price data or error
   */
  searchCard(card: ExtendedParsedCard): Promise<SourcePrice>;
}

/**
 * Default source configurations
 */
export const DEFAULT_SOURCE_CONFIGS = [
  {
    id: 'girafull' as PriceSource,
    name: 'Girafull',
    currency: 'JPY' as Currency,
    region: 'Japan',
    enabled: true,
  },
  {
    id: 'actionpoint' as PriceSource,
    name: 'ActionPoint',
    currency: 'SGD' as Currency,
    region: 'Singapore',
    enabled: false,
  },
  {
    id: 'starcitygames' as PriceSource,
    name: 'StarCityGames',
    currency: 'USD' as Currency,
    region: 'USA',
    enabled: false,
  },
  {
    id: 'tcgplayer' as PriceSource,
    name: 'TCGplayer',
    currency: 'USD' as Currency,
    region: 'USA',
    enabled: false,
  },
  {
    id: 'fabarmory' as PriceSource,
    name: 'FAB Armory',
    currency: 'NZD' as Currency,
    region: 'New Zealand',
    enabled: false,
  },
];
