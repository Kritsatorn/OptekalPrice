'use client';

import { useState, useCallback, useEffect } from 'react';
import { CardSearchResult, CardLanguage, DualCardResult } from '@/lib/types';
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
  dualLang: boolean;
  setDualLang: (value: boolean) => void;
  dualResults: DualCardResult[];
  selections: Map<number, CardLanguage>;
  selectLanguage: (index: number, lang: CardLanguage) => void;
  confirmSelections: () => void;
  isPickerMode: boolean;
}

export function useCardSearch(): UseCardSearchReturn {
  const [input, setInput] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [results, setResults] = useState<CardSearchResult[]>([]);
  const [parseErrors, setParseErrors] = useState<ParseResult['errors']>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Dual language state
  const [dualLang, setDualLangState] = useState(false);
  const [dualResults, setDualResults] = useState<DualCardResult[]>([]);
  const [selections, setSelections] = useState<Map<number, CardLanguage>>(new Map());
  const [pickerConfirmed, setPickerConfirmed] = useState(false);

  // Load dualLang preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cardcrew-dual-lang');
      if (stored === 'true') setDualLangState(true);
    } catch {
      // ignore
    }
  }, []);

  const setDualLang = useCallback((value: boolean) => {
    setDualLangState(value);
    try {
      localStorage.setItem('cardcrew-dual-lang', String(value));
    } catch {
      // ignore
    }
  }, []);

  const isPickerMode = dualLang && dualResults.length > 0 && !pickerConfirmed;

  const selectLanguage = useCallback((index: number, lang: CardLanguage) => {
    setSelections(prev => {
      const next = new Map(prev);
      next.set(index, lang);
      return next;
    });
  }, []);

  const confirmSelections = useCallback(() => {
    const confirmed: CardSearchResult[] = dualResults.map((dual, i) => {
      const lang = selections.get(i);
      const chosen = lang === 'JP' ? dual.jp : dual.en;

      if (chosen) return chosen;

      // Fallback: return a not-found result
      return {
        cardName: dual.cardName,
        foilType: dual.foilType,
        quantity: dual.quantity,
        productTitle: '',
        price: null,
        imageUrl: null,
        available: false,
        productUrl: '',
        setCode: null,
        error: 'No version selected or found',
      };
    });

    setResults(confirmed);
    setPickerConfirmed(true);
  }, [dualResults, selections]);

  const search = useCallback(async () => {
    const parsed = parseCardList(input);
    setParseErrors(parsed.errors);

    if (parsed.cards.length === 0) return;

    setIsSearching(true);
    setResults([]);
    setDualResults([]);
    setSelections(new Map());
    setPickerConfirmed(false);
    setProgress({ current: 0, total: parsed.cards.length });

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: parsed.cards, dualLang }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Search failed');
      }

      const data = await res.json();

      if (dualLang) {
        const dualData: DualCardResult[] = data.results;
        setDualResults(dualData);

        // Auto-select cards where only one language is available
        const autoSelections = new Map<number, CardLanguage>();
        dualData.forEach((dual, i) => {
          if (dual.en && !dual.jp) autoSelections.set(i, 'EN');
          else if (!dual.en && dual.jp) autoSelections.set(i, 'JP');
        });
        setSelections(autoSelections);
      } else {
        setResults(data.results);
      }

      setProgress({ current: parsed.cards.length, total: parsed.cards.length });
    } catch (err) {
      console.error('Search error:', err);
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
  }, [input, dualLang]);

  const clearResults = useCallback(() => {
    setResults([]);
    setDualResults([]);
    setSelections(new Map());
    setPickerConfirmed(false);
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
    dualLang,
    setDualLang,
    dualResults,
    selections,
    selectLanguage,
    confirmSelections,
    isPickerMode,
  };
}
