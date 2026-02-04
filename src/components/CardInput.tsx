'use client';

import { ParseError } from '@/lib/types';

interface CardInputProps {
  value: string;
  onChange: (value: string) => void;
  errors: ParseError[];
  disabled: boolean;
}

export default function CardInput({ value, onChange, errors, disabled }: CardInputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="card-input" className="block text-kicker font-medium text-t-muted uppercase tracking-wider">
        Card List
      </label>
      <textarea
        id="card-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        rows={8}
        className="w-full rounded-card bg-input-bg border border-input-border px-4 py-3 text-t-strong placeholder-t-muted focus:border-[var(--input-focus-ring)] focus:ring-2 focus:ring-[var(--input-focus-ring)]/20 focus:outline-none font-mono text-[13px] disabled:opacity-50 transition-all"
        placeholder={`Enter cards, one per line:\nTake the Bait Red NF 3\nSink Below Red RF\nCommand and Conquer CF 2\nArt of War EARF\nSpindle Marvel 1`}
      />
      <p className="text-kicker text-t-muted">
        Format: Card Name [Color] FOIL_TYPE [QUANTITY] — Foil types: NF, RF, CF, EARF, Marvel
      </p>
      {errors.length > 0 && (
        <div className="space-y-1 rounded-card bg-[var(--accent-danger)]/5 border border-[var(--accent-danger)]/15 p-3">
          {errors.map((err, i) => (
            <p key={i} className="text-[13px] text-[var(--accent-danger)]">
              <span className="font-mono">&quot;{err.line}&quot;</span> — {err.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
