'use client';

import { AggregatedCard, FoilType, CardLanguage } from '@/lib/types';

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

interface AggregatedTableProps {
  cards: AggregatedCard[];
}

export default function AggregatedTable({ cards }: AggregatedTableProps) {
  const grandTotal = cards.reduce((sum, c) => sum + c.totalCost, 0);

  if (cards.length === 0) return null;

  return (
    <div className="glass-card rounded-card bg-card shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] text-left">
          <thead>
            <tr className="border-b border-divider">
              <th className="px-5 py-3.5 text-kicker font-medium text-t-muted uppercase tracking-wider">Card Name</th>
              <th className="px-5 py-3.5 text-kicker font-medium text-t-muted uppercase tracking-wider">Foil</th>
              <th className="px-5 py-3.5 text-kicker font-medium text-t-muted uppercase tracking-wider">Lang</th>
              <th className="px-5 py-3.5 text-kicker font-medium text-t-muted uppercase tracking-wider">Card ID</th>
              <th className="px-5 py-3.5 text-kicker font-medium text-t-muted uppercase tracking-wider text-right">Total Qty</th>
              <th className="px-5 py-3.5 text-kicker font-medium text-t-muted uppercase tracking-wider text-right">Unit Price</th>
              <th className="px-5 py-3.5 text-kicker font-medium text-t-muted uppercase tracking-wider text-right">Total Cost</th>
              <th className="px-5 py-3.5 text-kicker font-medium text-t-muted uppercase tracking-wider">Buyers</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((card, i) => {
              const badge = foilBadgeStyles[card.foilType];
              return (
                <tr
                  key={i}
                  className="border-b border-divider last:border-b-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-5 py-3.5 text-t-strong font-medium">{card.cardName}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${badge.base} ${badge.glow}`}>
                      {card.foilType}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {card.language && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${langBadgeStyles[card.language]}`}>
                        {card.language}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-t-muted text-[12px]">{card.cardId || '—'}</td>
                  <td className="px-5 py-3.5 text-right text-t-body">{card.totalQuantity}</td>
                  <td className="px-5 py-3.5 text-right text-t-body">¥{card.pricePerUnit.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-right text-t-strong font-semibold">
                    ¥{card.totalCost.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-t-muted text-[12px]">
                    {card.buyers.map(b => `${b.buyerName} (${b.quantity})`).join(', ')}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-divider dark:bg-white/[0.02] bg-muted-surface/30">
              <td colSpan={6} className="px-5 py-4 text-right font-semibold text-t-strong text-title-sm">
                Grand Total
              </td>
              <td className="px-5 py-4 text-right font-bold text-metric-sm text-[var(--accent-success)]">
                ¥{grandTotal.toLocaleString()}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
