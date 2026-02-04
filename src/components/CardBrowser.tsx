'use client';

import { BrowserCard } from '@/lib/cardDatabase';
import CardBrowserTile from './CardBrowserTile';
import AddToListPopup from './AddToListPopup';
import { FoilType } from '@/lib/types';

interface CardBrowserProps {
  isLoading: boolean;
  loadError: string | null;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchResults: BrowserCard[];
  selectedCard: BrowserCard | null;
  onSelectCard: (card: BrowserCard) => void;
  onClearSelection: () => void;
  onAddToList: (card: BrowserCard, foilType: FoilType, quantity: number) => void;
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 md:gap-[18px] lg:gap-grid-gap grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="glass-card rounded-card bg-card shadow-card overflow-hidden animate-pulse">
          <div className="aspect-[5/7] bg-muted-surface dark:bg-white/5" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-muted-surface dark:bg-white/5 rounded w-3/4" />
            <div className="h-3 bg-muted-surface dark:bg-white/5 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CardBrowser({
  isLoading,
  loadError,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  selectedCard,
  onSelectCard,
  onClearSelection,
  onAddToList,
}: CardBrowserProps) {
  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-t-muted pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search cards by name..."
          className="w-full pl-10 pr-4 py-2.5 rounded-card bg-input-bg border border-input-border text-[13px] text-t-body placeholder:text-t-muted focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-transparent transition-all"
        />
      </div>

      {/* Loading state */}
      {isLoading && <SkeletonGrid />}

      {/* Error state */}
      {loadError && (
        <div className="text-center py-8">
          <p className="text-[13px] text-[var(--accent-danger)]">{loadError}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !loadError && searchQuery && searchResults.length === 0 && (
        <div className="text-center py-8">
          <p className="text-[13px] text-t-muted">No cards found for &quot;{searchQuery}&quot;</p>
        </div>
      )}

      {/* Prompt state */}
      {!isLoading && !loadError && !searchQuery && (
        <div className="text-center py-8">
          <p className="text-[13px] text-t-muted">Type a card name to start searching</p>
        </div>
      )}

      {/* Card grid */}
      {searchResults.length > 0 && (
        <div className="grid gap-4 md:gap-[18px] lg:gap-grid-gap grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {searchResults.map((card) => (
            <CardBrowserTile
              key={card.cardIdentifier}
              card={card}
              onClick={onSelectCard}
            />
          ))}
        </div>
      )}

      {/* Add to list popup */}
      {selectedCard && (
        <AddToListPopup
          card={selectedCard}
          onAdd={onAddToList}
          onClose={onClearSelection}
        />
      )}
    </div>
  );
}
