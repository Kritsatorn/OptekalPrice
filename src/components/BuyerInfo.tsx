'use client';

interface BuyerInfoProps {
  value: string;
  onChange: (value: string) => void;
}

export default function BuyerInfo({ value, onChange }: BuyerInfoProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="buyer-name" className="block text-kicker font-medium text-t-muted uppercase tracking-wider">
        Buyer Name
      </label>
      <input
        id="buyer-name"
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-card bg-input-bg border border-input-border px-4 py-2.5 text-t-strong placeholder-t-muted focus:border-[var(--input-focus-ring)] focus:ring-2 focus:ring-[var(--input-focus-ring)]/20 focus:outline-none text-[13px] transition-all"
        placeholder="Enter buyer name for CSV export"
      />
    </div>
  );
}
