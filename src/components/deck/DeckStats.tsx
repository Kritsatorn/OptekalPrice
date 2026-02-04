'use client';

import { SummaryStats } from '@/lib/aggregateCards';

interface DeckStatsProps {
  stats: SummaryStats;
}

export default function DeckStats({ stats }: DeckStatsProps) {
  const metrics = [
    { label: 'Buyers', value: stats.totalBuyers.toString() },
    { label: 'Unique Cards', value: stats.totalUniqueCards.toString() },
    { label: 'Total Qty', value: stats.totalCards.toLocaleString() },
    { label: 'Grand Total', value: `¥${stats.grandTotal.toLocaleString()}` },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.map(({ label, value }) => (
        <div
          key={label}
          className="glass-card rounded-card bg-card shadow-card p-4 text-center"
        >
          <p className="text-kicker font-medium text-t-muted uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className="text-title-md font-bold text-t-strong">{value}</p>
        </div>
      ))}
    </div>
  );
}
