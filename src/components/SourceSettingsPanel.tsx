'use client';

import { useState } from 'react';
import { PriceSourceConfig, PriceSource } from '@/lib/types';
import SourceToggle from './SourceToggle';

interface SourceSettingsPanelProps {
  sources: PriceSourceConfig[];
  onToggle: (id: PriceSource, enabled: boolean) => void;
  activeCount: number;
}

export default function SourceSettingsPanel({
  sources,
  onToggle,
  activeCount,
}: SourceSettingsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="glass-card shimmer-border rounded-card bg-card shadow-card overflow-hidden">
      {/* Header (always visible) */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted-surface/30 dark:hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          {/* Store icon */}
          <svg
            className="w-4 h-4 text-t-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>

          <span className="text-[13px] font-medium text-t-strong">
            Price Sources
          </span>

          {/* Active count badge */}
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted-surface text-t-muted">
            {activeCount} active
          </span>
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-t-muted transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Expandable content */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isExpanded ? 'max-h-96' : 'max-h-0'
        }`}
      >
        <div className="border-t border-divider px-2 py-2">
          {sources.map(source => (
            <SourceToggle
              key={source.id}
              source={source}
              onToggle={(enabled) => onToggle(source.id, enabled)}
            />
          ))}
        </div>

        {/* Helper text */}
        <div className="px-4 pb-3">
          <p className="text-[11px] text-t-muted">
            Enable multiple sources to compare prices across regions. Prices are converted to JPY for comparison.
          </p>
        </div>
      </div>
    </div>
  );
}
