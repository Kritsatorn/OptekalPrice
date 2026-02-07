'use client';

import { useState, useMemo, useCallback } from 'react';
import { ImportedBuyer, AggregatedCard } from '@/lib/types';
import { parseOptekalCSV, CsvParseError } from '@/lib/csvImport';
import { aggregateCards, computeSummaryStats, SummaryStats } from '@/lib/aggregateCards';

export type DeckView = 'buyers' | 'aggregated';

export function useCommandDeck() {
  const [buyers, setBuyers] = useState<ImportedBuyer[]>([]);
  const [importErrors, setImportErrors] = useState<CsvParseError[]>([]);
  const [activeView, setActiveView] = useState<DeckView>('buyers');
  const [expandedBuyerId, setExpandedBuyerId] = useState<string | null>(null);

  const aggregated: AggregatedCard[] = useMemo(
    () => aggregateCards(buyers),
    [buyers],
  );

  const stats: SummaryStats = useMemo(
    () => computeSummaryStats(buyers),
    [buyers],
  );

  const importFiles = useCallback(async (files: FileList | File[]) => {
    const newErrors: CsvParseError[] = [];
    const newBuyers: ImportedBuyer[] = [];

    for (const file of Array.from(files)) {
      const text = await file.text();
      const { buyer, error } = parseOptekalCSV(text, file.name);
      if (error) {
        newErrors.push(error);
      } else if (buyer) {
        newBuyers.push(buyer);
      }
    }

    setBuyers(prev => {
      let updated = [...prev];
      for (const b of newBuyers) {
        // Replace if same buyer name exists
        const existingIdx = updated.findIndex(
          existing => existing.buyerName === b.buyerName,
        );
        if (existingIdx >= 0) {
          updated[existingIdx] = b;
        } else {
          updated.push(b);
        }
      }
      return updated;
    });

    if (newErrors.length > 0) {
      setImportErrors(prev => [...prev, ...newErrors]);
    }
  }, []);

  const removeBuyer = useCallback((id: string) => {
    setBuyers(prev => prev.filter(b => b.id !== id));
    setExpandedBuyerId(prev => (prev === id ? null : prev));
  }, []);

  const clearAll = useCallback(() => {
    setBuyers([]);
    setImportErrors([]);
    setExpandedBuyerId(null);
  }, []);

  const dismissError = useCallback((index: number) => {
    setImportErrors(prev => prev.filter((_, i) => i !== index));
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedBuyerId(prev => (prev === id ? null : id));
  }, []);

  return {
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
  };
}
