import { FoilType, CardLanguage, ImportedCard, ImportedBuyer } from './types';

export interface CsvParseError {
  fileName: string;
  message: string;
}

const VALID_FOILS: FoilType[] = ['NF', 'RF', 'CF', 'EARF', 'Marvel'];
const VALID_LANGS: (CardLanguage | '')[] = ['EN', 'JP', ''];

function unquote(field: string): string {
  const trimmed = field.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }
  return trimmed;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

export function parseOptekalCSV(
  content: string,
  fileName: string,
): { buyer: ImportedBuyer | null; error: CsvParseError | null } {
  // Strip BOM
  const cleaned = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleaned.split('\n');

  if (lines.length < 5) {
    return { buyer: null, error: { fileName, message: 'File too short to be a valid OptekalPrice CSV' } };
  }

  // Line 0: Buyer: <name>
  const buyerMatch = lines[0].match(/^Buyer:\s*(.+)$/);
  if (!buyerMatch) {
    return { buyer: null, error: { fileName, message: 'Missing "Buyer: <name>" on line 1' } };
  }
  const buyerName = buyerMatch[1].trim();

  // Line 1: Date: <date>
  const dateMatch = lines[1].match(/^Date:\s*(.+)$/);
  if (!dateMatch) {
    return { buyer: null, error: { fileName, message: 'Missing "Date: <date>" on line 2' } };
  }
  const date = dateMatch[1].trim();

  // Line 2: blank, Line 3: header row
  // Find the header row (skip blanks after date)
  let headerIdx = 2;
  while (headerIdx < lines.length && lines[headerIdx].trim() === '') {
    headerIdx++;
  }

  if (headerIdx >= lines.length) {
    return { buyer: null, error: { fileName, message: 'Missing header row' } };
  }

  // Skip header row
  const dataStart = headerIdx + 1;

  const cards: ImportedCard[] = [];
  let grandTotal = 0;

  for (let i = dataStart; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;

    // Check for Grand Total line
    if (line.includes('Grand Total')) {
      const totalMatch = line.match(/Grand Total:\s*¥?([\d,]+)/);
      if (totalMatch) {
        grandTotal = parseInt(totalMatch[1].replace(/,/g, ''), 10);
      }
      break;
    }

    const fields = parseCSVLine(line);
    if (fields.length < 7) continue;

    const cardName = unquote(fields[0]);
    const foilRaw = unquote(fields[1]);
    const langRaw = unquote(fields[2]);
    const cardId = unquote(fields[3]);
    const quantity = parseInt(fields[4].trim(), 10);
    const pricePerUnit = parseInt(fields[5].trim(), 10);
    const subtotal = parseInt(fields[6].trim(), 10);

    if (!cardName || isNaN(quantity) || isNaN(pricePerUnit)) continue;

    const foilType = VALID_FOILS.includes(foilRaw as FoilType)
      ? (foilRaw as FoilType)
      : 'NF';

    const language = VALID_LANGS.includes(langRaw as CardLanguage | '')
      ? (langRaw as CardLanguage | '')
      : '';

    cards.push({
      cardName,
      foilType,
      language,
      cardId,
      quantity,
      pricePerUnit,
      subtotal: isNaN(subtotal) ? pricePerUnit * quantity : subtotal,
    });
  }

  if (cards.length === 0) {
    return { buyer: null, error: { fileName, message: 'No card data found in file' } };
  }

  // If grandTotal wasn't parsed from the file, compute it
  if (grandTotal === 0) {
    grandTotal = cards.reduce((sum, c) => sum + c.subtotal, 0);
  }

  const buyer: ImportedBuyer = {
    id: crypto.randomUUID(),
    buyerName,
    date,
    fileName,
    cards,
    grandTotal,
  };

  return { buyer, error: null };
}
