'use client';

import { SourcePrice, PriceSource, Currency } from '@/lib/types';
import { formatPrice } from '@/lib/currency';

interface SourcePriceChipsProps {
  sourcePrices: SourcePrice[];
  bestSource: PriceSource | null;
}

const SOURCE_DISPLAY: Record<PriceSource, { name: string; shortName: string; color: string; bgLight: string; bgDark: string }> = {
  girafull: {
    name: 'Girafull',
    shortName: 'Girafull',
    color: 'from-red-500 to-rose-600',
    bgLight: 'bg-red-50',
    bgDark: 'dark:bg-red-900/10',
  },
  actionpoint: {
    name: 'ActionPoint',
    shortName: 'ActionPt',
    color: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50',
    bgDark: 'dark:bg-emerald-900/10',
  },
  starcitygames: {
    name: 'StarCityGames',
    shortName: 'SCG',
    color: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    bgDark: 'dark:bg-blue-900/10',
  },
  tcgplayer: {
    name: 'TCGplayer',
    shortName: 'TCGplayer',
    color: 'from-orange-500 to-amber-600',
    bgLight: 'bg-orange-50',
    bgDark: 'dark:bg-orange-900/10',
  },
  fabarmory: {
    name: 'FAB Armory',
    shortName: 'FABArmory',
    color: 'from-purple-500 to-violet-600',
    bgLight: 'bg-purple-50',
    bgDark: 'dark:bg-purple-900/10',
  },
};

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

  // Calculate savings
  const availablePrices = sortedPrices
    .filter(sp => sp.available && sp.priceJPY !== null && !sp.error)
    .sort((a, b) => a.priceJPY! - b.priceJPY!);
  const savingsJPY = availablePrices.length >= 2
    ? availablePrices[1].priceJPY! - availablePrices[0].priceJPY!
    : 0;

  return (
    <div className="mt-4 pt-4 border-t border-divider">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-t-muted uppercase tracking-wider">
          Price Comparison
        </p>
        {savingsJPY > 0 && (
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
            Save up to ¥{savingsJPY.toLocaleString()}
          </span>
        )}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[minmax(80px,auto)_auto_1fr_auto] gap-x-3 px-3 pb-1.5 text-[10px] font-medium text-t-muted uppercase tracking-wider">
        <span>Source</span>
        <span>Stock</span>
        <span className="text-right">Price</span>
        <span className="w-4" />
      </div>

      <div className="space-y-1">
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
                grid grid-cols-[minmax(80px,auto)_auto_1fr_auto] gap-x-3 items-center
                px-3 py-2.5 rounded-lg transition-all duration-150
                ${hasError
                  ? 'bg-amber-50/50 dark:bg-amber-900/10 opacity-50 cursor-default'
                  : isBest
                    ? 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 ring-1 ring-emerald-300 dark:ring-emerald-700/50'
                    : 'bg-muted-surface/30 dark:bg-white/[0.03] hover:bg-muted-surface/50 dark:hover:bg-white/[0.06]'
                }
                ${sp.productUrl && !hasError ? 'hover:shadow-sm' : 'pointer-events-none'}
              `}
              onClick={hasError || !sp.productUrl ? (e) => e.preventDefault() : undefined}
            >
              {/* Source badge */}
              <div className="flex items-center gap-1.5">
                <span className={`
                  inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap
                  bg-gradient-to-r ${display.color}
                `}>
                  {display.shortName}
                </span>
                {isBest && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                    Best
                  </span>
                )}
              </div>

              {/* Stock */}
              <div className="flex items-center">
                {hasError ? (
                  <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      sp.available
                        ? 'bg-[var(--accent-success)]'
                        : 'bg-[var(--accent-danger)]'
                    }`}
                    title={sp.available ? 'In stock' : 'Out of stock'}
                  />
                )}
              </div>

              {/* Price */}
              <div className="text-right">
                {hasError ? (
                  <span className="text-[12px] text-amber-600 dark:text-amber-400">
                    {sp.error === 'Timeout' ? 'Timeout' : 'Not found'}
                  </span>
                ) : sp.price !== null ? (
                  <div className="flex items-baseline justify-end gap-1.5">
                    <span className={`text-[14px] font-semibold tabular-nums ${isBest ? 'text-emerald-700 dark:text-emerald-400' : 'text-t-strong'}`}>
                      {formatPrice(sp.price, sp.currency)}
                    </span>
                    {sp.priceJPY && sp.currency !== 'JPY' && (
                      <span className="text-[11px] text-t-muted tabular-nums">
                        ≈¥{sp.priceJPY.toLocaleString()}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[12px] text-t-muted">N/A</span>
                )}
              </div>

              {/* Link icon */}
              <div className="w-4 flex justify-center">
                {sp.productUrl && !hasError && (
                  <svg className="w-3.5 h-3.5 text-t-muted/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
