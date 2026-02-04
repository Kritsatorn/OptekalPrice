'use client';

import { FoilType } from '@/lib/types';
import { BuildListItem } from '@/hooks/useBuildList';
import { getCardDisplayName } from '@/lib/cardDatabase';
import DualLangToggle from './DualLangToggle';

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

interface BuildListProps {
  items: BuildListItem[];
  onRemove: (index: number) => void;
  onSearch: () => void;
  onClear: () => void;
  isSearching: boolean;
  dualLang: boolean;
  onDualLangChange: (value: boolean) => void;
}

export default function BuildList({
  items,
  onRemove,
  onSearch,
  onClear,
  isSearching,
  dualLang,
  onDualLangChange,
}: BuildListProps) {
  if (items.length === 0) {
    return (
      <div className="glass-card rounded-card bg-card shadow-card p-card-p">
        <p className="text-[13px] text-t-muted text-center py-4">
          No cards added yet. Search and click cards above to build your list.
        </p>
        <div className="flex justify-end pt-2">
          <DualLangToggle enabled={dualLang} onChange={onDualLangChange} />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card shimmer-border rounded-card bg-card shadow-card p-card-p space-y-3">
      <h3 className="text-title-sm font-semibold text-t-strong">
        Build List ({items.length} {items.length === 1 ? 'card' : 'cards'})
      </h3>

      {/* Item rows */}
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
        {items.map((item, i) => {
          const badge = foilBadgeStyles[item.foilType];
          return (
            <div
              key={`${item.card.cardIdentifier}-${item.foilType}-${i}`}
              className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted-surface dark:hover:bg-white/3 transition-colors"
            >
              <span className="text-[13px] text-t-body flex-1 truncate">{getCardDisplayName(item.card)}</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex-shrink-0 ${badge.base} ${badge.glow}`}
              >
                {item.foilType}
              </span>
              <span className="text-kicker text-t-muted flex-shrink-0 w-6 text-center">
                x{item.quantity}
              </span>
              <button
                onClick={() => onRemove(i)}
                className="text-t-muted hover:text-[var(--accent-danger)] transition-colors flex-shrink-0 p-0.5"
                aria-label={`Remove ${item.card.name}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={onSearch}
          disabled={isSearching || items.length === 0}
          className="px-6 py-2.5 rounded-full bg-[var(--accent-success)] hover:brightness-110 disabled:bg-muted-surface disabled:text-t-muted text-white text-[13px] font-semibold shadow-button hover:shadow-lg transition-all active:translate-y-px disabled:shadow-none disabled:hover:brightness-100"
        >
          {isSearching ? 'Searching...' : 'Search Prices'}
        </button>

        <button
          onClick={onClear}
          className="px-4 py-2.5 rounded-full border border-divider text-t-muted hover:text-t-strong hover:border-t-muted text-[13px] font-medium transition-all"
        >
          Clear All
        </button>

        <div className="ml-auto">
          <DualLangToggle enabled={dualLang} onChange={onDualLangChange} />
        </div>
      </div>
    </div>
  );
}
