import { NextRequest, NextResponse } from 'next/server';
import { searchCard, searchCardDual } from '@/lib/girafull';
import { SearchRequest, SearchResponse, DualSearchResponse, CardSearchResult, DualCardResult, PriceSource } from '@/lib/types';
import { searchCardAllSources } from '@/lib/sources';


const MAX_CARDS = 50;
const DELAY_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface ExtendedSearchRequest extends SearchRequest {
  enabledSources?: PriceSource[];
}

export async function POST(request: NextRequest) {
  try {
    const body: ExtendedSearchRequest = await request.json();

    if (!body.cards || !Array.isArray(body.cards)) {
      return NextResponse.json({ error: 'Invalid request: cards array required' }, { status: 400 });
    }

    if (body.cards.length > MAX_CARDS) {
      return NextResponse.json({ error: `Maximum ${MAX_CARDS} cards per request` }, { status: 400 });
    }

    // Get enabled sources (default to girafull only)
    const enabledSources: PriceSource[] = body.enabledSources && body.enabledSources.length > 0
      ? body.enabledSources
      : ['girafull'];

    // Check if we need multi-source search
    const hasMultipleSources = enabledSources.length > 1 ||
      (enabledSources.length === 1 && enabledSources[0] !== 'girafull');

    if (body.dualLang) {
      const results: DualCardResult[] = [];

      for (let i = 0; i < body.cards.length; i++) {
        const card = body.cards[i];
        const result = await searchCardDual(card);
        results.push(result);

        if (i < body.cards.length - 1) {
          await delay(DELAY_MS);
        }
      }

      const response: DualSearchResponse = { results };
      return NextResponse.json(response);
    }

    const results: CardSearchResult[] = [];

    for (let i = 0; i < body.cards.length; i++) {
      const card = body.cards[i];

      // Get primary result from Girafull (maintains backward compatibility)
      const result = await searchCard(card);

      // If multiple sources enabled, fetch prices from all sources
      // Pass the setCode from Girafull result to help other sources find the card
      if (hasMultipleSources) {
        const { sourcePrices, bestSource } = await searchCardAllSources(
          card,
          enabledSources,
          result.setCode || undefined  // Pass setCode from primary search
        );
        result.sourcePrices = sourcePrices;
        result.bestSource = bestSource ?? undefined;
      }

      results.push(result);

      // Delay between requests to be polite to the server
      if (i < body.cards.length - 1) {
        await delay(DELAY_MS);
      }
    }

    const response: SearchResponse = { results };
    return NextResponse.json(response);
  } catch (err) {
    console.error('Search API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
