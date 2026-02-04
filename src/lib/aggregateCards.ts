import { ImportedBuyer, AggregatedCard } from './types';

export function aggregateCards(buyers: ImportedBuyer[]): AggregatedCard[] {
  const map = new Map<string, AggregatedCard>();

  for (const buyer of buyers) {
    for (const card of buyer.cards) {
      const key = `${card.cardName}|${card.foilType}|${card.language}`;

      const existing = map.get(key);
      if (existing) {
        existing.totalQuantity += card.quantity;
        existing.pricePerUnit = Math.max(existing.pricePerUnit, card.pricePerUnit);
        existing.totalCost = existing.totalQuantity * existing.pricePerUnit;
        existing.buyers.push({ buyerName: buyer.buyerName, quantity: card.quantity });
      } else {
        map.set(key, {
          cardName: card.cardName,
          foilType: card.foilType,
          language: card.language,
          cardId: card.cardId,
          totalQuantity: card.quantity,
          pricePerUnit: card.pricePerUnit,
          totalCost: card.quantity * card.pricePerUnit,
          buyers: [{ buyerName: buyer.buyerName, quantity: card.quantity }],
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.cardName.localeCompare(b.cardName),
  );
}

export interface SummaryStats {
  totalBuyers: number;
  totalCards: number;
  totalUniqueCards: number;
  grandTotal: number;
}

export function computeSummaryStats(buyers: ImportedBuyer[]): SummaryStats {
  const uniqueKeys = new Set<string>();
  let totalCards = 0;
  let grandTotal = 0;

  for (const buyer of buyers) {
    grandTotal += buyer.grandTotal;
    for (const card of buyer.cards) {
      totalCards += card.quantity;
      uniqueKeys.add(`${card.cardName}|${card.foilType}|${card.language}`);
    }
  }

  return {
    totalBuyers: buyers.length,
    totalCards,
    totalUniqueCards: uniqueKeys.size,
    grandTotal,
  };
}
