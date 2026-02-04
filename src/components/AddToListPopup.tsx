'use client';

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FoilType } from '@/lib/types';
import { BrowserCard, CardPrinting, getCardImageUrl } from '@/lib/cardDatabase';
import CardImage from './CardImage';

const foilTypes: FoilType[] = ['NF', 'RF', 'CF', 'EARF', 'Marvel'];

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

function printingLabel(pr: CardPrinting): string {
  const parts = [pr.set];
  if (pr.edition) parts.push(pr.edition);
  if (pr.foiling) parts.push(pr.foiling);
  if (pr.treatment) parts.push(pr.treatment);
  return parts.join(' - ');
}

/** Thumbnail that hides itself when the image fails to load */
function PrintingThumb({
  pr,
  isSelected,
  onClick,
}: {
  pr: CardPrinting;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [broken, setBroken] = useState(false);

  if (broken) return null;

  return (
    <button
      onClick={onClick}
      className={`
        flex-shrink-0 w-[52px] aspect-[5/7] rounded-[6px] overflow-hidden border-2 transition-all
        ${isSelected
          ? 'border-[var(--accent-success)] scale-105'
          : 'border-transparent opacity-60 hover:opacity-100'
        }
      `}
      title={printingLabel(pr)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getCardImageUrl(pr.image)}
        alt={printingLabel(pr)}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => setBroken(true)}
      />
    </button>
  );
}

interface AddToListPopupProps {
  card: BrowserCard;
  onAdd: (card: BrowserCard, foilType: FoilType, quantity: number) => void;
  onClose: () => void;
}

export default function AddToListPopup({ card, onAdd, onClose }: AddToListPopupProps) {
  const [foilType, setFoilType] = useState<FoilType>('NF');
  const [quantity, setQuantity] = useState(1);
  const [selectedPrintingIdx, setSelectedPrintingIdx] = useState(0);

  const activePrinting = card.printings[selectedPrintingIdx];

  // Build fallback chain for the main image: selected printing first, then all others
  const mainImageIds = useCallback(() => {
    const ids: string[] = [];
    const seen = new Set<string>();
    // Selected printing first
    if (activePrinting?.image) {
      ids.push(activePrinting.image);
      seen.add(activePrinting.image);
    }
    // Then all other printings as fallback
    for (const pr of card.printings) {
      if (pr.image && !seen.has(pr.image)) {
        ids.push(pr.image);
        seen.add(pr.image);
      }
    }
    // Then defaultImage as last resort
    if (card.defaultImage && !seen.has(card.defaultImage)) {
      ids.push(card.defaultImage);
    }
    return ids;
  }, [activePrinting, card.printings, card.defaultImage]);

  const handleAdd = () => {
    onAdd(card, foilType, quantity);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative glass-card rounded-card bg-card shadow-card-hover p-5 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card name + type */}
        <div>
          <h3 className="text-title-md font-semibold text-t-strong">{card.name}</h3>
          <p className="text-kicker text-t-muted mt-0.5">
            {card.types.join(', ')} {card.classes.length > 0 && card.classes[0] !== 'NotClassed' ? `- ${card.classes.join(', ')}` : ''}
          </p>
        </div>

        {/* Selected printing image */}
        <div className="w-full aspect-[5/7] max-w-[220px] mx-auto rounded-[10px] overflow-hidden bg-muted-surface dark:bg-white/5">
          <CardImage
            key={selectedPrintingIdx}
            imageIds={mainImageIds()}
            alt={`${card.name}${activePrinting ? ` - ${printingLabel(activePrinting)}` : ''}`}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Printings selector */}
        {card.printings.length > 1 && (
          <div>
            <p className="text-kicker font-medium text-t-muted mb-2">
              Printing ({selectedPrintingIdx + 1}/{card.printings.length})
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {card.printings.map((pr, i) => (
                <PrintingThumb
                  key={`${pr.identifier}-${pr.image}`}
                  pr={pr}
                  isSelected={i === selectedPrintingIdx}
                  onClick={() => setSelectedPrintingIdx(i)}
                />
              ))}
            </div>
            <p className="text-[11px] text-t-muted mt-1.5 truncate">
              {printingLabel(activePrinting)}
            </p>
          </div>
        )}

        {/* Foil type selector */}
        <div>
          <p className="text-kicker font-medium text-t-muted mb-2">Foil Type</p>
          <div className="flex flex-wrap gap-1.5">
            {foilTypes.map((ft) => {
              const style = foilBadgeStyles[ft];
              const isSelected = foilType === ft;
              return (
                <button
                  key={ft}
                  onClick={() => setFoilType(ft)}
                  className={`
                    px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all
                    ${isSelected ? `${style.base} ${style.glow} scale-105` : 'bg-muted-surface dark:bg-white/5 text-t-muted hover:text-t-body'}
                  `}
                >
                  {ft}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quantity selector */}
        <div>
          <p className="text-kicker font-medium text-t-muted mb-2">Quantity</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-full bg-muted-surface dark:bg-white/5 text-t-body hover:text-t-strong flex items-center justify-center transition-colors"
            >
              -
            </button>
            <span className="text-title-md font-semibold text-t-strong w-8 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-full bg-muted-surface dark:bg-white/5 text-t-body hover:text-t-strong flex items-center justify-center transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleAdd}
            className="flex-1 px-4 py-2.5 rounded-full bg-[var(--accent-success)] hover:brightness-110 text-white text-[13px] font-semibold shadow-button transition-all active:translate-y-px"
          >
            Add to List
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-full border border-divider text-t-muted hover:text-t-strong hover:border-t-muted text-[13px] font-medium transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
