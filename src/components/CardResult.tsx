'use client';

import { CardSearchResult, FoilType } from '@/lib/types';
import SourcePriceChips from './SourcePriceChips';

const foilBadgeStyles: Record<FoilType, { base: string; glow: string }> = {
  NF: {
    base: 'bg-[#E4E6EB] text-[#586060] dark:bg-white/10 dark:text-white/60',
    glow: '',
  },
  RF: {
    base: 'bg-gradient-to-r from-rose-400 via-amber-400 to-sky-400 text-white',
    glow: 'glow-rf',
  },
  CF: {
    base: 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white',
    glow: 'glow-cf',
  },
  EARF: {
    base: 'bg-gradient-to-r from-rose-400 via-amber-300 to-sky-400 text-white ring-2 ring-amber-300/60',
    glow: 'glow-earf',
  },
  Marvel: {
    base: 'bg-gradient-to-r from-violet-500 to-purple-600 text-white',
    glow: 'glow-marvel',
  },
};

interface CardResultProps {
  result: CardSearchResult;
}

export default function CardResult({ result }: CardResultProps) {
  const hasError = !!result.error;
  const subtotal = result.price ? result.price * result.quantity : null;
  const badge = foilBadgeStyles[result.foilType];

  return (
    <div
      className={`
        glass-card shimmer-border group relative flex gap-4 rounded-card p-card-p
        bg-card shadow-card hover:shadow-card-hover hover:-translate-y-0.5
        transition-all duration-200
        ${hasError ? 'border-[var(--accent-danger)]/20' : ''}
      `}
    >
      {/* Card Image */}
      <div className="flex-shrink-0 w-[88px] h-[120px] rounded-[10px] overflow-hidden bg-muted-surface dark:bg-white/5">
        {result.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={result.imageUrl}
            alt={result.cardName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-t-muted text-kicker text-center p-2">
            No image
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-title-sm font-semibold text-t-strong truncate">
                {result.cardName}
              </h3>
              {result.setCode && (
                <p className="text-kicker text-t-muted mt-0.5">{result.setCode}</p>
              )}
            </div>
            <span
              className={`
                inline-flex items-center px-2.5 py-1 rounded-full
                text-[11px] font-bold tracking-wide flex-shrink-0
                ${badge.base} ${badge.glow}
              `}
            >
              {result.foilType}
            </span>
          </div>
        </div>

        {hasError ? (
          <p className="text-[13px] text-[var(--accent-danger)] mt-2">{result.error}</p>
        ) : (
          <div className="mt-auto pt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-metric-sm font-semibold text-t-strong">
                ¥{result.price?.toLocaleString()}
              </span>
              <span className="text-kicker text-t-muted font-medium">NM</span>
              {!result.available && (
                <span className="inline-flex items-center gap-1 text-kicker font-medium text-[var(--accent-danger)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-danger)] inline-block" />
                  Out of stock
                </span>
              )}
              {result.available && (
                <span className="inline-flex items-center gap-1 text-kicker font-medium text-[var(--accent-success)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-success)] inline-block" />
                  In stock
                </span>
              )}
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[13px] text-t-muted">
              <span>Qty: {result.quantity}</span>
              {subtotal !== null && (
                <span className="font-semibold text-t-strong">
                  ¥{subtotal.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}

        {result.productUrl && (
          <a
            href={result.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-kicker font-medium text-[var(--primary-400)] hover:text-[var(--primary-500)] dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            View on Girafull
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}

        {/* Source Price Chips (multi-source comparison) */}
        {result.sourcePrices && result.sourcePrices.length > 0 && (
          <SourcePriceChips
            sourcePrices={result.sourcePrices}
            bestSource={result.bestSource || null}
          />
        )}

        {/* Alternatives */}
        {result.alternatives && result.alternatives.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-divider">
            <p className="text-kicker font-medium text-t-muted uppercase tracking-wider mb-1.5">Also available</p>
            <div className="flex flex-wrap gap-1.5">
              {result.alternatives.map((alt, i) => {
                const altBadge = foilBadgeStyles[alt.foilType];
                return (
                  <a
                    key={i}
                    href={alt.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted-surface/50 dark:bg-white/[0.04] hover:bg-muted-surface dark:hover:bg-white/[0.08] transition-colors"
                  >
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${altBadge.base}`}>
                      {alt.foilType}
                    </span>
                    {alt.setCode && (
                      <span className="text-[10px] text-t-muted">{alt.setCode}</span>
                    )}
                    {alt.price !== null && (
                      <span className="text-[11px] text-t-body font-medium">¥{alt.price.toLocaleString()}</span>
                    )}
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${alt.available ? 'bg-[var(--accent-success)]' : 'bg-[var(--accent-danger)]'}`} />
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
