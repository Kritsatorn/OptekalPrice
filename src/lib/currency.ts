import { Currency, SourcePrice, PriceSource } from './types';

// Fallback static exchange rates (1 unit = X JPY)
// These rates are approximate and used when API is unavailable
const EXCHANGE_RATES: Record<Currency, number> = {
  JPY: 1,
  SGD: 113,  // 1 SGD ≈ 113 JPY
  USD: 155,  // 1 USD ≈ 155 JPY
};

/**
 * Convert an amount from a given currency to JPY
 */
export function convertToJPY(amount: number, currency: Currency): number {
  return Math.round(amount * EXCHANGE_RATES[currency]);
}

/**
 * Get the currency symbol for display
 */
export function getCurrencySymbol(currency: Currency): string {
  switch (currency) {
    case 'JPY':
      return '¥';
    case 'SGD':
      return 'S$';
    case 'USD':
      return '$';
    default:
      return '';
  }
}

/**
 * Format a price with its currency symbol
 */
export function formatPrice(price: number, currency: Currency): string {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${price.toLocaleString()}`;
}

/**
 * Find the source with the best (lowest) price in JPY
 * Only considers sources with available stock and valid prices
 */
export function findBestPrice(sourcePrices: SourcePrice[]): PriceSource | null {
  let bestSource: PriceSource | null = null;
  let bestPriceJPY = Infinity;

  for (const sp of sourcePrices) {
    // Skip unavailable or errored sources
    if (!sp.available || sp.priceJPY === null || sp.error) {
      continue;
    }

    if (sp.priceJPY < bestPriceJPY) {
      bestPriceJPY = sp.priceJPY;
      bestSource = sp.source;
    }
  }

  return bestSource;
}
