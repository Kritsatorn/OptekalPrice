'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserCard, loadCardDatabase, searchCards } from '@/lib/cardDatabase';

export function useCardBrowser() {
  const [allCards, setAllCards] = useState<BrowserCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BrowserCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<BrowserCard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loaded = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(async () => {
    if (loaded.current) return;
    loaded.current = true;
    setIsLoading(true);
    setLoadError(null);
    try {
      const cards = await loadCardDatabase();
      setAllCards(cards);
    } catch {
      setLoadError('Failed to load card database');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (allCards.length === 0) {
      setSearchResults([]);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      setSearchResults(searchCards(allCards, searchQuery));
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery, allCards]);

  const selectCard = useCallback((card: BrowserCard) => {
    setSelectedCard(card);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCard(null);
  }, []);

  return {
    isLoading,
    loadError,
    searchQuery,
    setSearchQuery,
    searchResults,
    selectedCard,
    selectCard,
    clearSelection,
    load,
  };
}
