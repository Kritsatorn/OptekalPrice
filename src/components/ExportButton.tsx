'use client';

import { CardSearchResult } from '@/lib/types';
import { generateCSV, downloadCSV } from '@/lib/csvExport';

interface ExportButtonProps {
  results: CardSearchResult[];
  buyerName: string;
}

export default function ExportButton({ results, buyerName }: ExportButtonProps) {
  const validResults = results.filter(r => !r.error && r.price !== null);

  if (validResults.length === 0) return null;

  const handleExport = () => {
    const csv = generateCSV(results, buyerName);
    downloadCSV(csv, buyerName);
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white text-[13px] font-semibold shadow-button hover:shadow-lg transition-all active:translate-y-px"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Export CSV
    </button>
  );
}
