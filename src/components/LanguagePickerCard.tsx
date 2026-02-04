'use client';

import { CardSearchResult, CardLanguage, FoilType } from '@/lib/types';

const foilBadgeStyles: Record<FoilType, string> = {
  NF: 'bg-[#E4E6EB] text-[#586060] dark:bg-white/10 dark:text-white/60',
  RF: 'bg-gradient-to-r from-rose-400 via-amber-400 to-sky-400 text-white',
  CF: 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white',
  EARF: 'bg-gradient-to-r from-rose-400 via-amber-300 to-sky-400 text-white',
  Marvel: 'bg-gradient-to-r from-violet-500 to-purple-600 text-white',
};

interface LanguagePickerCardProps {
  cardName: string;
  foilType: FoilType;
  quantity: number;
  en: CardSearchResult | null;
  jp: CardSearchResult | null;
  selected: CardLanguage | undefined;
  onSelect: (lang: CardLanguage) => void;
}

function LangOption({
  lang,
  result,
  isSelected,
  isDisabled,
  onClick,
}: {
  lang: CardLanguage;
  result: CardSearchResult | null;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
}) {
  const available = result && !result.error;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={`
        flex-1 rounded-card p-3 border-2 transition-all duration-200 text-left
        ${isSelected
          ? 'border-[var(--accent-success)] bg-[var(--accent-success)]/5 shadow-md'
          : available
            ? 'border-divider hover:border-t-muted bg-card'
            : 'border-divider bg-muted-surface opacity-50 cursor-not-allowed'
        }
      `}
    >
      {/* Language badge */}
      <span
        className={`
          inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide mb-2
          ${lang === 'EN'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
          }
        `}
      >
        {lang}
      </span>

      {available ? (
        <>
          {/* Card image */}
          <div className="w-full aspect-[3/4] rounded-[8px] overflow-hidden bg-muted-surface dark:bg-white/5 mb-2">
            {result.imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={result.imageUrl}
                alt={`${result.cardName} (${lang})`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-t-muted text-kicker">
                No image
              </div>
            )}
          </div>

          {/* Price & stock */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-semibold text-t-strong">
                {result.price !== null ? `¥${result.price.toLocaleString()}` : '—'}
              </span>
              <span className="text-kicker text-t-muted">NM</span>
            </div>
            {result.available ? (
              <span className="inline-flex items-center gap-1 text-kicker font-medium text-[var(--accent-success)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-success)] inline-block" />
                In stock
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-kicker font-medium text-[var(--accent-danger)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-danger)] inline-block" />
                Out of stock
              </span>
            )}
          </div>

          {/* View on Girafull link */}
          {result.productUrl && (
            <a
              href={result.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 mt-2 text-kicker font-medium text-[var(--primary-400)] hover:text-[var(--primary-500)] dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              View on Girafull
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}

          {/* Alternatives */}
          {result.alternatives && result.alternatives.length > 0 && (
            <div className="mt-2 pt-2 border-t border-divider">
              <p className="text-[10px] font-medium text-t-muted uppercase tracking-wider mb-1">Also available</p>
              <div className="flex flex-wrap gap-1">
                {result.alternatives.map((alt, i) => (
                  <a
                    key={i}
                    href={alt.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted-surface/50 dark:bg-white/[0.04] hover:bg-muted-surface dark:hover:bg-white/[0.08] transition-colors"
                  >
                    <span className={`inline-flex items-center px-1 py-px rounded-full text-[9px] font-bold tracking-wide ${foilBadgeStyles[alt.foilType]}`}>
                      {alt.foilType}
                    </span>
                    {alt.setCode && (
                      <span className="text-[9px] text-t-muted">{alt.setCode}</span>
                    )}
                    {alt.price !== null && (
                      <span className="text-[10px] text-t-body font-medium">¥{alt.price.toLocaleString()}</span>
                    )}
                    <span className={`w-1 h-1 rounded-full inline-block ${alt.available ? 'bg-[var(--accent-success)]' : 'bg-[var(--accent-danger)]'}`} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="w-full aspect-[3/4] rounded-[8px] bg-muted-surface dark:bg-white/5 flex items-center justify-center mb-2">
          <span className="text-[13px] text-t-muted">Not Found</span>
        </div>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div className="mt-2 flex items-center justify-center gap-1 text-[12px] font-semibold text-[var(--accent-success)]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Selected
        </div>
      )}
    </button>
  );
}

export default function LanguagePickerCard({
  cardName,
  foilType,
  quantity,
  en,
  jp,
  selected,
  onSelect,
}: LanguagePickerCardProps) {
  const badge = foilBadgeStyles[foilType];

  return (
    <div className="glass-card shimmer-border rounded-card bg-card shadow-card p-card-p">
      {/* Card header */}
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <h3 className="text-title-sm font-semibold text-t-strong truncate">{cardName}</h3>
          <span className="text-kicker text-t-muted">Qty: {quantity}</span>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide flex-shrink-0 ${badge}`}
        >
          {foilType}
        </span>
      </div>

      {/* Side-by-side language options */}
      <div className="grid grid-cols-2 gap-3">
        <LangOption
          lang="EN"
          result={en}
          isSelected={selected === 'EN'}
          isDisabled={!en || !!en.error}
          onClick={() => onSelect('EN')}
        />
        <LangOption
          lang="JP"
          result={jp}
          isSelected={selected === 'JP'}
          isDisabled={!jp || !!jp.error}
          onClick={() => onSelect('JP')}
        />
      </div>
    </div>
  );
}
