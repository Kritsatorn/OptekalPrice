'use client';

import { ImportedBuyer, FoilType, CardLanguage } from '@/lib/types';

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

const langBadgeStyles: Record<CardLanguage, string> = {
  EN: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  JP: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

interface BuyerCardProps {
  buyer: ImportedBuyer;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
}

export default function BuyerCard({ buyer, isExpanded, onToggle, onRemove }: BuyerCardProps) {
  return (
    <div className="glass-card rounded-card bg-card shadow-card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={onToggle}
      >
        <svg
          className={`w-4 h-4 text-t-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>

        <span className="text-[14px] font-semibold text-t-strong flex-1">
          {buyer.buyerName}
        </span>

        <span className="text-[12px] text-t-muted">{buyer.date}</span>
        <span className="text-[12px] text-t-muted">{buyer.cards.length} cards</span>
        <span className="text-[13px] font-semibold text-[var(--accent-success)]">
          ¥{buyer.grandTotal.toLocaleString()}
        </span>

        <button
          onClick={e => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-2 p-1 rounded-full hover:bg-red-500/10 text-t-muted hover:text-red-400 transition-colors"
          aria-label={`Remove ${buyer.buyerName}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Expanded table */}
      {isExpanded && (
        <div className="border-t border-divider overflow-x-auto">
          <table className="w-full text-[13px] text-left">
            <thead>
              <tr className="border-b border-divider">
                <th className="px-5 py-3 text-kicker font-medium text-t-muted uppercase tracking-wider">Card Name</th>
                <th className="px-5 py-3 text-kicker font-medium text-t-muted uppercase tracking-wider">Foil</th>
                <th className="px-5 py-3 text-kicker font-medium text-t-muted uppercase tracking-wider">Lang</th>
                <th className="px-5 py-3 text-kicker font-medium text-t-muted uppercase tracking-wider">Card ID</th>
                <th className="px-5 py-3 text-kicker font-medium text-t-muted uppercase tracking-wider text-right">Qty</th>
                <th className="px-5 py-3 text-kicker font-medium text-t-muted uppercase tracking-wider text-right">Price</th>
                <th className="px-5 py-3 text-kicker font-medium text-t-muted uppercase tracking-wider text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {buyer.cards.map((card, i) => {
                const badge = foilBadgeStyles[card.foilType];
                return (
                  <tr
                    key={i}
                    className="border-b border-divider last:border-b-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3 text-t-strong font-medium">{card.cardName}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${badge.base} ${badge.glow}`}>
                        {card.foilType}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {card.language && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${langBadgeStyles[card.language]}`}>
                          {card.language}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-t-muted text-[12px]">{card.cardId || '—'}</td>
                    <td className="px-5 py-3 text-right text-t-body">{card.quantity}</td>
                    <td className="px-5 py-3 text-right text-t-body">¥{card.pricePerUnit.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-t-strong font-semibold">
                      ¥{card.subtotal.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
