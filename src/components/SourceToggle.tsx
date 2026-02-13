'use client';

import { PriceSourceConfig, Currency, PriceSource } from '@/lib/types';

interface SourceToggleProps {
  source: PriceSourceConfig;
  onToggle: (enabled: boolean) => void;
}

function getSourceBadge(sourceId: PriceSource, currency: Currency): { symbol: string; className: string } {
  // Source-specific colors
  const sourceColors: Record<PriceSource, string> = {
    girafull: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    actionpoint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    starcitygames: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    tcgplayer: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    fabarmory: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };

  const symbols: Record<Currency, string> = {
    JPY: '¥',
    SGD: 'S$',
    USD: '$',
    NZD: 'NZ$',
  };

  return {
    symbol: symbols[currency] || '',
    className: sourceColors[sourceId] || 'bg-gray-100 text-gray-700',
  };
}

export default function SourceToggle({ source, onToggle }: SourceToggleProps) {
  const badge = getSourceBadge(source.id, source.currency);

  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted-surface/50 dark:hover:bg-white/[0.03] transition-colors">
      <div className="flex items-center gap-3">
        {/* Status dot */}
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            source.enabled
              ? 'bg-[var(--accent-success)]'
              : 'bg-gray-300 dark:bg-gray-600'
          }`}
        />

        {/* Source info */}
        <div className="flex flex-col">
          <span className="text-[13px] font-medium text-t-strong">{source.name}</span>
          <span className="text-[11px] text-t-muted">{source.region}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Currency badge */}
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${badge.className}`}
        >
          {badge.symbol}{source.currency}
        </span>

        {/* Toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={source.enabled}
          onClick={() => onToggle(!source.enabled)}
          className={`
            relative w-9 h-5 rounded-full transition-colors duration-200
            ${source.enabled
              ? 'bg-[var(--accent-success)]'
              : 'bg-muted-surface dark:bg-white/10'
            }
          `}
        >
          <span
            className={`
              absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm
              transition-transform duration-200
              ${source.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'}
            `}
          />
        </button>
      </div>
    </div>
  );
}
