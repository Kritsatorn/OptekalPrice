export type FoilType = 'NF' | 'RF' | 'CF' | 'EARF' | 'Marvel';
export type CardLanguage = 'EN' | 'JP';

// Price source types
export type PriceSource = 'girafull' | 'actionpoint' | 'starcitygames' | 'tcgplayer';
export type Currency = 'JPY' | 'SGD' | 'USD';

export interface PriceSourceConfig {
  id: PriceSource;
  name: string;
  currency: Currency;
  region: string;
  enabled: boolean;
}

export interface SourcePrice {
  source: PriceSource;
  currency: Currency;
  price: number | null;
  priceJPY: number | null;  // Converted for comparison
  available: boolean;
  productUrl: string;
  setCode: string | null;
  error?: string;
}

export interface ParsedCard {
  cardName: string;
  foilType: FoilType;
  quantity: number;
  rawLine: string;
  lang?: CardLanguage;
}

export interface CardAlternative {
  foilType: FoilType;
  language: CardLanguage | '';
  price: number | null;
  available: boolean;
  productUrl: string;
  setCode: string | null;
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
  alternatives?: CardAlternative[];
  sourcePrices?: SourcePrice[];  // Prices from all enabled sources
  bestSource?: PriceSource;      // Source with best price
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

export interface ImportedCard {
  cardName: string;
  foilType: FoilType;
  language: CardLanguage | '';
  cardId: string;
  quantity: number;
  pricePerUnit: number;
  subtotal: number;
}

export interface ImportedBuyer {
  id: string;
  buyerName: string;
  date: string;
  fileName: string;
  cards: ImportedCard[];
  grandTotal: number;
}

export interface AggregatedCard {
  cardName: string;
  foilType: FoilType;
  language: CardLanguage | '';
  cardId: string;
  totalQuantity: number;
  pricePerUnit: number;
  totalCost: number;
  buyers: { buyerName: string; quantity: number }[];
}
