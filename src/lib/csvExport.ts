import { CardSearchResult, PriceSource } from './types';
import { formatPrice } from './currency';

const SOURCE_NAMES: Record<PriceSource, string> = {
  girafull: 'Girafull',
  actionpoint: 'ActionPoint',
  starcitygames: 'SCG',
  tcgplayer: 'TCGplayer',
  fabarmory: 'FAB Armory',
};

function detectLanguage(result: CardSearchResult): string {
  const title = result.productTitle.toLowerCase();
  const url = result.productUrl.toLowerCase();
  if (title.includes('【jp】') || url.includes('_langjp')) return 'JP';
  if (title.includes('【en】') || url.includes('_langen')) return 'EN';
  return '';
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function generateCSV(results: CardSearchResult[], buyerName: string): string {
  const BOM = '\uFEFF';
  const date = new Date().toISOString().split('T')[0];
  const lines: string[] = [];

  lines.push(`Buyer: ${buyerName}`);
  lines.push(`Date: ${date}`);
  lines.push('');
  // Collect all sources that appear in any result
  const allSources = new Set<PriceSource>();
  for (const result of results) {
    if (result.sourcePrices) {
      for (const sp of result.sourcePrices) {
        allSources.add(sp.source);
      }
    }
  }
  const sourceList = Array.from(allSources);

  const sourceHeaders = sourceList.map(s => SOURCE_NAMES[s] || s).join(',');
  const headerSuffix = sourceList.length > 0 ? `,Best Source,${sourceHeaders}` : '';
  lines.push(`Card Name,Foil Type,Language,Card ID,Quantity,Price per Unit (JPY),Subtotal (JPY)${headerSuffix}`);

  let grandTotal = 0;

  for (const result of results) {
    if (result.error || result.price === null) continue;

    const subtotal = result.price * result.quantity;
    grandTotal += subtotal;

    const name = csvEscape(result.cardName);
    const lang = detectLanguage(result);
    const set = result.setCode || '';

    let sourceSuffix = '';
    if (sourceList.length > 0) {
      const bestName = result.bestSource ? (SOURCE_NAMES[result.bestSource] || result.bestSource) : '';
      const sourcePrices = sourceList.map(s => {
        const sp = result.sourcePrices?.find(p => p.source === s);
        if (!sp || sp.error || sp.price === null) return '';
        return formatPrice(sp.price, sp.currency);
      }).join(',');
      sourceSuffix = `,${csvEscape(bestName)},${sourcePrices}`;
    }

    lines.push(`${name},${csvEscape(result.foilType)},${csvEscape(lang)},${csvEscape(set)},${result.quantity},${result.price},${subtotal}${sourceSuffix}`);
  }

  lines.push('');
  lines.push(`,,,,,,Grand Total: ¥${grandTotal.toLocaleString()}`);

  return BOM + lines.join('\n');
}

export function downloadCSV(csv: string, buyerName: string): void {
  const date = new Date().toISOString().split('T')[0];
  const filename = `${buyerName || 'optekalprice'}_${date}.csv`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
