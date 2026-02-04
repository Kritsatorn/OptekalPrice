'use client';

import { BrowserCard } from '@/lib/cardDatabase';
import CardImage from './CardImage';

interface CardBrowserTileProps {
  card: BrowserCard;
  onClick: (card: BrowserCard) => void;
}

const pitchColors: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-yellow-400',
  3: 'bg-blue-500',
};

/** Build ordered list: defaultImage first, then all unique printing images */
function buildImageFallbacks(card: BrowserCard): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  if (card.defaultImage) {
    ids.push(card.defaultImage);
    seen.add(card.defaultImage);
  }
  for (const pr of card.printings) {
    if (pr.image && !seen.has(pr.image)) {
      ids.push(pr.image);
      seen.add(pr.image);
    }
  }
  return ids;
}

export default function CardBrowserTile({ card, onClick }: CardBrowserTileProps) {
  return (
    <button
      onClick={() => onClick(card)}
      className="glass-card shimmer-border rounded-card bg-card shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 text-left overflow-hidden group"
    >
      {/* Card Image */}
      <div className="aspect-[5/7] w-full overflow-hidden bg-muted-surface dark:bg-white/5 relative">
        <CardImage
          imageIds={buildImageFallbacks(card)}
          alt={card.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {card.printings.length > 1 && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold backdrop-blur-sm">
            {card.printings.length} arts
          </span>
        )}
      </div>

      {/* Card Info */}
      <div className="p-3 space-y-1.5">
        <div className="flex items-start gap-1.5">
          {card.pitch !== undefined && (
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${pitchColors[card.pitch] || 'bg-gray-400'}`} />
          )}
          <h3 className="text-[13px] font-semibold text-t-strong leading-tight line-clamp-2">
            {card.name}
          </h3>
        </div>
        <div className="flex flex-wrap gap-1">
          {card.sets.slice(0, 2).map((set) => (
            <span
              key={set}
              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted-surface dark:bg-white/8 text-t-muted"
            >
              {set}
            </span>
          ))}
          {card.sets.length > 2 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-t-muted">
              +{card.sets.length - 2}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
