export type FoilType = 'NF' | 'RF' | 'CF' | 'EARF' | 'Marvel';
export type CardLanguage = 'EN' | 'JP';

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

export interface DualCardResult {
  cardName: string;
  foilType: FoilType;
  quantity: number;
  en: CardSearchResult | null;
  jp: CardSearchResult | null;
}

export interface SearchRequest {
  cards: ParsedCard[];
  dualLang?: boolean;
}

export interface SearchResponse {
  results: CardSearchResult[];
}

export interface DualSearchResponse {
  results: DualCardResult[];
}

export interface ParseError {
  line: string;
  message: string;
}
