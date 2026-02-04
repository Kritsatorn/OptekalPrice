'use client';

interface DualLangToggleProps {
  enabled: boolean;
  onChange: (value: boolean) => void;
}

export default function DualLangToggle({ enabled, onChange }: DualLangToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className="inline-flex items-center gap-2 group"
      aria-pressed={enabled}
    >
      {/* Globe icon */}
      <svg className="w-4 h-4 text-t-muted group-hover:text-t-body transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>

      <span className="text-[12px] font-medium text-t-muted select-none">EN/JP</span>

      {/* Toggle pill */}
      <div
        className={`
          relative w-9 h-5 rounded-full transition-colors duration-200
          ${enabled
            ? 'bg-[var(--accent-success)]'
            : 'bg-muted-surface'
          }
        `}
      >
        <div
          className={`
            absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm
            transition-transform duration-200
            ${enabled ? 'translate-x-[18px]' : 'translate-x-0.5'}
          `}
        />
      </div>
    </button>
  );
}
