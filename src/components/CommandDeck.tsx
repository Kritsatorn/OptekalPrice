'use client';

import { useCommandDeck, DeckView } from '@/hooks/useCommandDeck';
import CsvDropZone from './deck/CsvDropZone';
import DeckStats from './deck/DeckStats';
import BuyerCard from './deck/BuyerCard';
import AggregatedTable from './deck/AggregatedTable';

const viewOptions: { key: DeckView; label: string }[] = [
  { key: 'buyers', label: 'By Buyer' },
  { key: 'aggregated', label: 'Purchase Order' },
];

export default function CommandDeck() {
  const {
    buyers,
    importErrors,
    activeView,
    setActiveView,
    expandedBuyerId,
    toggleExpanded,
    aggregated,
    stats,
    importFiles,
    removeBuyer,
    clearAll,
    dismissError,
  } = useCommandDeck();

  return (
    <div className="space-y-5">
      {/* Drop Zone */}
      <CsvDropZone onFiles={importFiles} />

      {/* Import Errors */}
      {importErrors.length > 0 && (
        <div className="space-y-2">
          {importErrors.map((err, i) => (
            <div
              key={i}
              className="glass-card rounded-card bg-card shadow-card p-4 flex items-center gap-3 border border-red-500/20"
            >
              <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-t-strong font-medium truncate">{err.fileName}</p>
                <p className="text-[12px] text-t-muted">{err.message}</p>
              </div>
              <button
                onClick={() => dismissError(i)}
                className="p-1 rounded-full hover:bg-white/5 text-t-muted hover:text-t-body transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats + Content (only show when buyers exist) */}
      {buyers.length > 0 && (
        <>
          <DeckStats stats={stats} />

          {/* View Switcher */}
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-full p-1 bg-muted-surface dark:bg-white/5">
              {viewOptions.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveView(key)}
                  className={`
                    px-4 py-1.5 rounded-full text-[13px] font-medium transition-all
                    ${activeView === key
                      ? 'bg-[var(--accent-success)] text-white shadow-sm'
                      : 'text-t-muted hover:text-t-body'
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={clearAll}
              className="px-4 py-2 rounded-full border border-divider text-t-muted hover:text-red-400 hover:border-red-400/30 text-[13px] font-medium transition-all"
            >
              Clear All
            </button>
          </div>

          {/* By Buyer View */}
          {activeView === 'buyers' && (
            <div className="space-y-3">
              {buyers.map(buyer => (
                <BuyerCard
                  key={buyer.id}
                  buyer={buyer}
                  isExpanded={expandedBuyerId === buyer.id}
                  onToggle={() => toggleExpanded(buyer.id)}
                  onRemove={() => removeBuyer(buyer.id)}
                />
              ))}
            </div>
          )}

          {/* Purchase Order View */}
          {activeView === 'aggregated' && (
            <AggregatedTable cards={aggregated} />
          )}
        </>
      )}
    </div>
  );
}
