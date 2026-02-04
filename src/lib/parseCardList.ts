import { FoilType, CardLanguage, ParsedCard, ParseError } from './types';

const VALID_FOIL_TYPES: FoilType[] = ['NF', 'RF', 'CF', 'EARF', 'Marvel'];

export interface ParseResult {
  cards: ParsedCard[];
  errors: ParseError[];
}

export function parseCardList(input: string): ParseResult {
  const cards: ParsedCard[] = [];
  const errors: ParseError[] = [];

  const lines = input.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    // Check for language prefix [EN] or [JP]
    let lang: CardLanguage | undefined;
    let rest = line;
    const langMatch = rest.match(/^\[(EN|JP)\]\s*/i);
    if (langMatch) {
      lang = langMatch[1].toUpperCase() as CardLanguage;
      rest = rest.slice(langMatch[0].length);
    }

    const tokens = rest.split(/\s+/);

    if (tokens.length < 2) {
      errors.push({ line, message: 'Need at least a card name and foil type' });
      continue;
    }

    // Last token might be quantity (a number)
    let quantity = 1;
    let lastIndex = tokens.length - 1;
    const lastToken = tokens[lastIndex];
    if (/^\d+$/.test(lastToken)) {
      quantity = parseInt(lastToken, 10);
      lastIndex--;
    }

    if (lastIndex < 1) {
      errors.push({ line, message: 'Need at least a card name and foil type' });
      continue;
    }

    // The token at lastIndex should be the foil type
    const foilToken = tokens[lastIndex].toUpperCase();
    const foilType = VALID_FOIL_TYPES.find(f => f === foilToken);

    if (!foilType) {
      errors.push({ line, message: `Invalid foil type "${tokens[lastIndex]}". Use: NF, RF, CF, EARF, Marvel` });
      continue;
    }

    // Everything before the foil type is the card name
    const cardName = tokens.slice(0, lastIndex).join(' ');

    if (!cardName) {
      errors.push({ line, message: 'Card name is empty' });
      continue;
    }

    cards.push({ cardName, foilType, quantity, rawLine: line, lang });
  }

  return { cards, errors };
}
