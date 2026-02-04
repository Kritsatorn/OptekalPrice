'use client';

import { DualCardResult, CardLanguage } from '@/lib/types';
import LanguagePickerCard from './LanguagePickerCard';

interface LanguagePickerProps {
  dualResults: DualCardResult[];
  selections: Map<number, CardLanguage>;
  onSelect: (index: number, lang: CardLanguage) => void;
  onConfirm: () => void;
}

export default function LanguagePicker({
  dualResults,
  selections,
  onSelect,
  onConfirm,
}: LanguagePickerProps) {
  const allSelected = dualResults.every((_, i) => selections.has(i));
  const selectedCount = selections.size;
  const totalCount = dualResults.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-title-md font-semibold text-t-strong">Choose Language Version</h2>
          <p className="text-[13px] text-t-muted mt-0.5">
            {selectedCount}/{totalCount} selected — pick EN or JP for each card
          </p>
        </div>
      </div>

      {/* Card grid */}
      <div className="grid gap-4 md:gap-[18px] lg:gap-grid-gap grid-cols-1 md:grid-cols-2">
        {dualResults.map((dual, i) => (
          <LanguagePickerCard
            key={i}
            cardName={dual.cardName}
            foilType={dual.foilType}
            quantity={dual.quantity}
            en={dual.en}
            jp={dual.jp}
            selected={selections.get(i)}
            onSelect={(lang) => onSelect(i, lang)}
          />
        ))}
      </div>

      {/* Confirm button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onConfirm}
          disabled={!allSelected}
          className="px-8 py-3 rounded-full bg-[var(--accent-success)] hover:brightness-110 disabled:bg-muted-surface disabled:text-t-muted text-white text-[14px] font-semibold shadow-button hover:shadow-lg transition-all active:translate-y-px disabled:shadow-none disabled:hover:brightness-100"
        >
          Confirm Selections ({selectedCount}/{totalCount})
        </button>
      </div>
    </div>
  );
}
