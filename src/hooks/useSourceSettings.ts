'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { PriceSource, PriceSourceConfig } from '@/lib/types';
import { DEFAULT_SOURCE_CONFIGS } from '@/lib/sources/types';

const STORAGE_KEY = 'optekalprice-source-settings';

interface UseSourceSettingsReturn {
  sources: PriceSourceConfig[];
  toggleSource: (id: PriceSource, enabled: boolean) => void;
  enabledSources: PriceSource[];
  activeCount: number;
}

/**
 * Hook for managing price source settings with localStorage persistence
 */
export function useSourceSettings(): UseSourceSettingsReturn {
  const [sources, setSources] = useState<PriceSourceConfig[]>(DEFAULT_SOURCE_CONFIGS);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Merge stored settings with defaults (to handle new sources added later)
          const merged = DEFAULT_SOURCE_CONFIGS.map(defaultConfig => {
            const storedConfig = parsed.find((s: PriceSourceConfig) => s.id === defaultConfig.id);
            return storedConfig
              ? { ...defaultConfig, enabled: storedConfig.enabled }
              : defaultConfig;
          });
          setSources(merged);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Toggle a source on/off
  const toggleSource = useCallback((id: PriceSource, enabled: boolean) => {
    setSources(prev => {
      const updated = prev.map(source =>
        source.id === id ? { ...source, enabled } : source
      );

      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }

      return updated;
    });
  }, []);

  // Compute derived values (memoized to prevent infinite loops)
  const enabledSources = useMemo(
    () => sources.filter(s => s.enabled).map(s => s.id),
    [sources]
  );
  const activeCount = enabledSources.length;

  return {
    sources,
    toggleSource,
    enabledSources,
    activeCount,
  };
}
