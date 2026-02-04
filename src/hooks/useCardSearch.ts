'use client';

import { useState, useCallback } from 'react';
import { CardSearchResult } from '@/lib/types';
import { parseCardList, ParseResult } from '@/lib/parseCardList';

interface UseCardSearchReturn {
  input: string;
  setInput: (value: string) => void;
  buyerName: string;
  setBuyerName: (value: string) => void;
  results: CardSearchResult[];
  parseErrors: ParseResult['errors'];
  isSearching: boolean;
  progress: { current: number; total: number };
  search: () => Promise<void>;
  clearResults: () => void;
}

export function useCardSearch(): UseCardSearchReturn {
  const [input, setInput] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [results, setResults] = useState<CardSearchResult[]>([]);
  const [parseErrors, setParseErrors] = useState<ParseResult['errors']>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const search = useCallback(async () => {
    const parsed = parseCardList(input);
    setParseErrors(parsed.errors);

    if (parsed.cards.length === 0) return;

    setIsSearching(true);
    setResults([]);
    setProgress({ current: 0, total: parsed.cards.length });

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: parsed.cards }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Search failed');
      }

      const data = await res.json();
      setResults(data.results);
      setProgress({ current: parsed.cards.length, total: parsed.cards.length });
    } catch (err) {
      console.error('Search error:', err);
      // Create error results for all cards
      const errorResults: CardSearchResult[] = parsed.cards.map(card => ({
        cardName: card.cardName,
        foilType: card.foilType,
        quantity: card.quantity,
        productTitle: '',
        price: null,
        imageUrl: null,
        available: false,
        productUrl: '',
        setCode: null,
        error: err instanceof Error ? err.message : 'Search failed',
      }));
      setResults(errorResults);
    } finally {
      setIsSearching(false);
    }
  }, [input]);

  const clearResults = useCallback(() => {
    setResults([]);
    setParseErrors([]);
    setProgress({ current: 0, total: 0 });
  }, []);

  return {
    input,
    setInput,
    buyerName,
    setBuyerName,
    results,
    parseErrors,
    isSearching,
    progress,
    search,
    clearResults,
  };
}
