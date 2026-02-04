import { CardSearchResult } from './types';

export function generateCSV(results: CardSearchResult[], buyerName: string): string {
  const BOM = '\uFEFF';
  const date = new Date().toISOString().split('T')[0];
  const lines: string[] = [];

  lines.push(`Buyer: ${buyerName}`);
  lines.push(`Date: ${date}`);
  lines.push('');
  lines.push('Card Name,Foil Type,Quantity,Price per Unit (JPY),Subtotal (JPY)');

  let grandTotal = 0;

  for (const result of results) {
    if (result.error || result.price === null) continue;

    const subtotal = result.price * result.quantity;
    grandTotal += subtotal;

    const name = `"${result.cardName.replace(/"/g, '""')}"`;
    lines.push(`${name},"${result.foilType}",${result.quantity},${result.price},${subtotal}`);
  }

  lines.push('');
  lines.push(`,,,,"Grand Total: ¥${grandTotal.toLocaleString()}"`);

  return BOM + lines.join('\n');
}

export function downloadCSV(csv: string, buyerName: string): void {
  const date = new Date().toISOString().split('T')[0];
  const filename = `${buyerName || 'cardcrew'}_${date}.csv`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
