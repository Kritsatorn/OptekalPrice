'use client';

import { useCardSearch } from '@/hooks/useCardSearch';
import { useTheme } from '@/hooks/useTheme';
import CardInput from '@/components/CardInput';
import BuyerInfo from '@/components/BuyerInfo';
import CardResult from '@/components/CardResult';
import ResultsTable from '@/components/ResultsTable';
import ExportButton from '@/components/ExportButton';
import DualLangToggle from '@/components/DualLangToggle';
import LanguagePicker from '@/components/LanguagePicker';

export default function Home() {
  const {
    input,
    setInput,
    buyerName,
    setBuyerName,
    results,
    parseErrors,
    isSearching,
    progress,
    search,
    clearResults,
    dualLang,
    setDualLang,
    dualResults,
    selections,
    selectLanguage,
    confirmSelections,
    isPickerMode,
  } = useCardSearch();

  const { theme, toggle, mounted } = useTheme();

  return (
    <div className="min-h-screen bg-page p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="max-w-[1120px] mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-t-strong tracking-tight">
              CardCrew
            </h1>
            <p className="text-[13px] text-t-muted mt-1">Search Flesh and Blood cards on Girafull</p>
          </div>

          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={toggle}
              className="glass-card p-2.5 rounded-full shadow-card hover:shadow-card-hover transition-all"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Main Panel */}
        <div className="glass-panel rounded-panel bg-panel p-4 sm:p-5 md:p-6 lg:p-7">
          {/* Input Section */}
          <div className="glass-card shimmer-border rounded-card bg-card shadow-card p-card-p space-y-4 mb-5">
            <BuyerInfo value={buyerName} onChange={setBuyerName} />
            <CardInput
              value={input}
              onChange={setInput}
              errors={parseErrors}
              disabled={isSearching}
            />

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={search}
                disabled={isSearching || !input.trim()}
                className="px-6 py-2.5 rounded-full bg-[var(--accent-success)] hover:brightness-110 disabled:bg-muted-surface disabled:text-t-muted text-white text-[13px] font-semibold shadow-button hover:shadow-lg transition-all active:translate-y-px disabled:shadow-none disabled:hover:brightness-100"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>

              {(results.length > 0 || dualResults.length > 0) && (
                <button
                  onClick={clearResults}
                  className="px-4 py-2.5 rounded-full border border-divider text-t-muted hover:text-t-strong hover:border-t-muted text-[13px] font-medium transition-all"
                >
                  Clear
                </button>
              )}

              <div className="ml-auto">
                <DualLangToggle enabled={dualLang} onChange={setDualLang} />
              </div>
            </div>
          </div>

          {/* Loading Progress */}
          {isSearching && (
            <div className="glass-card rounded-card bg-card shadow-card p-card-p mb-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-[var(--primary-400)] border-t-transparent rounded-full animate-spin" />
                <span className="text-[13px] text-t-body">
                  Searching cards... {progress.current}/{progress.total}
                </span>
              </div>
              <div className="w-full bg-muted-surface rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' }}
                />
              </div>
            </div>
          )}

          {/* Language Picker */}
          {isPickerMode && (
            <LanguagePicker
              dualResults={dualResults}
              selections={selections}
              onSelect={selectLanguage}
              onConfirm={confirmSelections}
            />
          )}

          {/* Results */}
          {!isPickerMode && results.length > 0 && (
            <div className="space-y-5">
              {/* Card Grid */}
              <div className="space-y-4">
                <h2 className="text-title-md font-semibold text-t-strong">Results</h2>
                <div className="grid gap-4 md:gap-[18px] lg:gap-grid-gap grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {results.map((result, i) => (
                    <CardResult key={i} result={result} />
                  ))}
                </div>
              </div>

              {/* Summary Table */}
              <ResultsTable results={results} />

              {/* Export */}
              <div className="flex justify-end pt-1">
                <ExportButton results={results} buyerName={buyerName} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
