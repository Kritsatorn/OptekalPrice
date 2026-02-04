'use client';

import { useState, useCallback } from 'react';
import { FoilType, ParsedCard } from '@/lib/types';
import { BrowserCard, getCardDisplayName } from '@/lib/cardDatabase';

export interface BuildListItem {
  card: BrowserCard;
  foilType: FoilType;
  quantity: number;
}

export function useBuildList() {
  const [items, setItems] = useState<BuildListItem[]>([]);

  const addItem = useCallback((card: BrowserCard, foilType: FoilType, quantity: number) => {
    setItems(prev => {
      const existing = prev.findIndex(
        item => item.card.cardIdentifier === card.cardIdentifier && item.foilType === foilType,
      );
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = {
          ...updated[existing],
          quantity: updated[existing].quantity + quantity,
        };
        return updated;
      }
      return [...prev, { card, foilType, quantity }];
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateItem = useCallback((index: number, updates: Partial<Pick<BuildListItem, 'foilType' | 'quantity'>>) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  }, []);

  const clearList = useCallback(() => {
    setItems([]);
  }, []);

  const toParsedCards = useCallback((): ParsedCard[] => {
    return items.map(item => {
      const displayName = getCardDisplayName(item.card);
      return {
        cardName: displayName,
        foilType: item.foilType,
        quantity: item.quantity,
        rawLine: `${displayName} ${item.foilType} ${item.quantity}`,
      };
    });
  }, [items]);

  return {
    items,
    addItem,
    removeItem,
    updateItem,
    clearList,
    toParsedCards,
  };
}
