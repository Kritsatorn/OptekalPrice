'use client';

import { SourcePrice, PriceSource, Currency } from '@/lib/types';
import { formatPrice } from '@/lib/currency';

interface SourcePriceChipsProps {
  sourcePrices: SourcePrice[];
  bestSource: PriceSource | null;
}

const SOURCE_DISPLAY: Record<PriceSource, { name: string; shortName: string; color: string }> = {
  girafull: {
    name: 'Girafull',
    shortName: 'Girafull',
    color: 'from-red-500 to-rose-600',
  },
  actionpoint: {
    name: 'ActionPoint',
    shortName: 'ActionPt',
    color: 'from-emerald-500 to-teal-600',
  },
  starcitygames: {
    name: 'StarCityGames',
    shortName: 'SCG',
    color: 'from-blue-500 to-indigo-600',
  },
  tcgplayer: {
    name: 'TCGplayer',
    shortName: 'TCGplayer',
    color: 'from-orange-500 to-amber-600',
  },
};

function getCurrencySymbol(currency: Currency): string {
  switch (currency) {
    case 'JPY': return '¥';
    case 'SGD': return 'S$';
    case 'USD': return '$';
    default: return '';
  }
}

export default function SourcePriceChips({ sourcePrices, bestSource }: SourcePriceChipsProps) {
  if (sourcePrices.length === 0) {
    return null;
  }

  // Sort: best price first, then by price, errors last
  const sortedPrices = [...sourcePrices].sort((a, b) => {
    if (a.source === bestSource) return -1;
    if (b.source === bestSource) return 1;
    if (a.error && !b.error) return 1;
    if (!a.error && b.error) return -1;
    if (a.priceJPY === null) return 1;
    if (b.priceJPY === null) return -1;
    return a.priceJPY - b.priceJPY;
  });

  return (
    <div className="mt-3 pt-3 border-t border-divider">
      <p className="text-[11px] font-semibold text-t-muted uppercase tracking-wider mb-2">
        Price Comparison
      </p>

      <div className="space-y-1.5">
        {sortedPrices.map(sp => {
          const isBest = sp.source === bestSource && sp.available && sp.price !== null && !sp.error;
          const hasError = !!sp.error;
          const display = SOURCE_DISPLAY[sp.source];

          return (
            <a
              key={sp.source}
              href={sp.productUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`
                flex items-center justify-between gap-2 px-3 py-2 rounded-lg
                transition-all duration-150
                ${hasError
                  ? 'bg-amber-50/50 dark:bg-amber-900/10 opacity-60 cursor-default'
                  : isBest
                    ? 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800/50'
                    : 'bg-muted-surface/30 dark:bg-white/[0.03] hover:bg-muted-surface/50 dark:hover:bg-white/[0.05]'
                }
                ${sp.productUrl && !hasError ? 'hover:shadow-sm' : 'pointer-events-none'}
              `}
              onClick={hasError || !sp.productUrl ? (e) => e.preventDefault() : undefined}
            >
              {/* Source info */}
              <div className="flex items-center gap-2 min-w-0">
                {/* Source badge */}
                <span className={`
                  inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-white
                  bg-gradient-to-r ${display.color}
                `}>
                  {display.shortName}
                </span>

                {/* Stock indicator */}
                {!hasError && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      sp.available
                        ? 'bg-[var(--accent-success)]'
                        : 'bg-[var(--accent-danger)]'
                    }`}
                    title={sp.available ? 'In stock' : 'Out of stock'}
                  />
                )}

                {/* Best badge */}
                {isBest && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Best
                  </span>
                )}
              </div>

              {/* Price or error */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {hasError ? (
                  <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {sp.error === 'Timeout' ? 'Timeout' : 'Not found'}
                  </span>
                ) : sp.price !== null ? (
                  <div className="text-right">
                    <span className={`text-[13px] font-semibold ${isBest ? 'text-emerald-700 dark:text-emerald-400' : 'text-t-strong'}`}>
                      {formatPrice(sp.price, sp.currency)}
                    </span>
                    {sp.priceJPY && sp.currency !== 'JPY' && (
                      <span className="text-[10px] text-t-muted ml-1">
                        (≈¥{sp.priceJPY.toLocaleString()})
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[11px] text-t-muted">N/A</span>
                )}

                {/* External link icon */}
                {sp.productUrl && !hasError && (
                  <svg className="w-3 h-3 text-t-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
