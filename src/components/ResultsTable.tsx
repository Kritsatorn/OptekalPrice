'use client';

import { CardSearchResult, FoilType, CardLanguage } from '@/lib/types';

const foilBadgeStyles: Record<FoilType, { base: string; glow: string }> = {
  NF: {
    base: 'bg-[#E4E6EB] text-[#586060] dark:bg-white/10 dark:text-white/60',
    glow: '',
  },
  RF: {
    base: 'bg-gradient-to-r from-rose-400 via-amber-400 to-sky-400 text-white',
    glow: 'glow-rf',
  },
  CF: {
    base: 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white',
    glow: 'glow-cf',
  },
  EARF: {
    base: 'bg-gradient-to-r from-rose-400 via-amber-300 to-sky-400 text-white ring-2 ring-amber-300/60',
    glow: 'glow-earf',
  },
  Marvel: {
    base: 'bg-gradient-to-r from-violet-500 to-purple-600 text-white',
    glow: 'glow-marvel',
  },
};

const langBadgeStyles: Record<CardLanguage, string> = {
  EN: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  JP: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

function detectLanguage(result: CardSearchResult): CardLanguage | null {
  const title = result.productTitle.toLowerCase();
  const url = result.productUrl.toLowerCase();
  if (title.includes('【jp】') || url.includes('_langjp')) return 'JP';
  if (title.includes('【en】') || url.includes('_langen')) return 'EN';
  return null;
}

interface ResultsTableProps {
  results: CardSearchResult[];
}

export default function ResultsTable({ results }: ResultsTableProps) {
  const validResults = results.filter(r => !r.error && r.price !== null);
  const errorResults = results.filter(r => r.error);
  const grandTotal = validResults.reduce((sum, r) => sum + (r.price! * r.quantity), 0);

  if (results.length === 0) return null;

  return (
    <div className="space-y-5">
      <h2 className="text-title-md font-semibold text-t-strong">Summary</h2>

      <div className="glass-card rounded-card bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] text-left">
            <thead>
              <tr className="border-b border-divider">
                <th className="px-5 py-3.5 text-kicker font-medium text-t-muted uppercase tracking-wider">Card Name</th>
                <th className="px-5 py-3.5 text-kicker font-medium text-t-muted uppercase tracking-wider">Foil</th>
                <th className="px-5 py-3.5 text-kicker font-medium text-t-muted uppercase tracking-wider">Lang</th>
                <th className="px-5 py-3.5 text-kicker font-medium text-t-muted uppercase tracking-wider">Card ID</th>
                <th className="px-5 py-3.5 text-kicker font-medium text-t-muted uppercase tracking-wider text-right">Qty</th>
                <th className="px-5 py-3.5 text-kicker font-medium text-t-muted uppercase tracking-wider text-right">Price</th>
                <th className="px-5 py-3.5 text-kicker font-medium text-t-muted uppercase tracking-wider text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {validResults.map((result, i) => {
                const badge = foilBadgeStyles[result.foilType];
                const lang = detectLanguage(result);
                return (
                  <tr
                    key={i}
                    className="border-b border-divider last:border-b-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5 text-t-strong font-medium">{result.cardName}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${badge.base} ${badge.glow}`}>
                        {result.foilType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {lang && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${langBadgeStyles[lang]}`}>
                          {lang}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-t-muted text-[12px]">
                      {result.setCode || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right text-t-body">{result.quantity}</td>
                    <td className="px-5 py-3.5 text-right text-t-body">
                      <span className="inline-flex items-center gap-1.5">
                        ¥{result.price!.toLocaleString()}
                        <span className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${result.available ? 'bg-[var(--accent-success)]' : 'bg-[var(--accent-danger)]'}`} />
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-t-strong font-semibold">
                      ¥{(result.price! * result.quantity).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-divider dark:bg-white/[0.02] bg-muted-surface/30">
                <td colSpan={6} className="px-5 py-4 text-right font-semibold text-t-strong text-title-sm">
                  Grand Total
                </td>
                <td className="px-5 py-4 text-right font-bold text-metric-sm text-[var(--accent-success)]">
                  ¥{grandTotal.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {errorResults.length > 0 && (
        <div className="glass-card rounded-card bg-card shadow-card p-card-p space-y-2">
          <h3 className="text-title-sm font-semibold text-[var(--accent-danger)]">
            Not Found ({errorResults.length})
          </h3>
          {errorResults.map((result, i) => (
            <p key={i} className="text-[13px] text-t-muted">
              {result.cardName} ({result.foilType}) — {result.error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
