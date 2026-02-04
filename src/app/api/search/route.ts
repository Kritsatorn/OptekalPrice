import { NextRequest, NextResponse } from 'next/server';
import { searchCard, searchCardDual } from '@/lib/girafull';
import { SearchRequest, SearchResponse, DualSearchResponse, CardSearchResult, DualCardResult } from '@/lib/types';


const MAX_CARDS = 50;
const DELAY_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json();

    if (!body.cards || !Array.isArray(body.cards)) {
      return NextResponse.json({ error: 'Invalid request: cards array required' }, { status: 400 });
    }

    if (body.cards.length > MAX_CARDS) {
      return NextResponse.json({ error: `Maximum ${MAX_CARDS} cards per request` }, { status: 400 });
    }

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
      const result = await searchCard(card);
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
