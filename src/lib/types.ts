export type FoilType = 'NF' | 'RF' | 'CF' | 'EARF' | 'Marvel';

export interface ParsedCard {
  cardName: string;
  foilType: FoilType;
  quantity: number;
  rawLine: string;
}

export interface CardSearchResult {
  cardName: string;
  foilType: FoilType;
  quantity: number;
  productTitle: string;
  price: number | null;
  imageUrl: string | null;
  available: boolean;
  productUrl: string;
  setCode: string | null;
  error?: string;
}

export interface SearchRequest {
  cards: ParsedCard[];
}

export interface SearchResponse {
  results: CardSearchResult[];
}

export interface ParseError {
  line: string;
  message: string;
}
