'use client';

import { useState } from 'react';
import { useCardSearch } from '@/hooks/useCardSearch';
import { useSourceSettings } from '@/hooks/useSourceSettings';
import { useTheme } from '@/hooks/useTheme';
import { useBuildList } from '@/hooks/useBuildList';
import { useCardBrowser } from '@/hooks/useCardBrowser';
import { BrowserCard, getCardDisplayName } from '@/lib/cardDatabase';
import { FoilType } from '@/lib/types';
import CardInput from '@/components/CardInput';
import BuyerInfo from '@/components/BuyerInfo';
import CardResult from '@/components/CardResult';
import ResultsTable from '@/components/ResultsTable';
import ExportButton from '@/components/ExportButton';
import DualLangToggle from '@/components/DualLangToggle';
import LanguagePicker from '@/components/LanguagePicker';
import TabSwitcher from '@/components/TabSwitcher';
import CardBrowser from '@/components/CardBrowser';
import BuildList from '@/components/BuildList';
import CommandDeck from '@/components/CommandDeck';
import SourceSettingsPanel from '@/components/SourceSettingsPanel';

export default function Home() {
  const sourceSettings = useSourceSettings();

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
    searchFromList,
    clearResults,
    dualLang,
    setDualLang,
    dualResults,
    selections,
    selectLanguage,
    confirmSelections,
    isPickerMode,
  } = useCardSearch({ enabledSources: sourceSettings.enabledSources });

  const { theme, toggle, mounted } = useTheme();
  const [activeTab, setActiveTab] = useState<'text' | 'browser' | 'deck'>('text');

  const buildList = useBuildList();
  const browser = useCardBrowser();

  const handleTabChange = (tab: 'text' | 'browser' | 'deck') => {
    setActiveTab(tab);
    if (tab === 'browser') {
      browser.load();
    }
  };

  const handleAddToList = (card: BrowserCard, foilType: FoilType, quantity: number) => {
    buildList.addItem(card, foilType, quantity);

    // Also append to text input so both tabs stay in sync
    const displayName = getCardDisplayName(card);
    const line = `${displayName} ${foilType} ${quantity}`;
    setInput(input ? `${input}\n${line}` : line);
  };

  const handleRemoveFromList = (index: number) => {
    const item = buildList.items[index];
    if (item) {
      // Remove matching line from text input
      const displayName = getCardDisplayName(item.card);
      const line = `${displayName} ${item.foilType} ${item.quantity}`;
      const lines = input.split('\n');
      const lineIdx = lines.findIndex(l => l.trim() === line);
      if (lineIdx >= 0) {
        lines.splice(lineIdx, 1);
        setInput(lines.join('\n'));
      }
    }
    buildList.removeItem(index);
  };

  const handleClearBuildList = () => {
    // Remove all build list lines from text input
    const linesToRemove = new Set(
      buildList.items.map(item => {
        const displayName = getCardDisplayName(item.card);
        return `${displayName} ${item.foilType} ${item.quantity}`;
      }),
    );
    const remaining = input.split('\n').filter(l => !linesToRemove.has(l.trim()));
    setInput(remaining.join('\n'));
    buildList.clearList();
  };

  const handleBrowserSearch = () => {
    const parsed = buildList.toParsedCards();
    searchFromList(parsed);
  };

  return (
    <div className="min-h-screen bg-page p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="max-w-[1120px] mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-t-strong tracking-tight">
              OptekalPrice
            </h1>
            <p className="text-[13px] text-t-muted mt-1">Compare Flesh and Blood card prices across multiple shops</p>
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
          {/* Tab Switcher */}
          <div className="mb-5">
            <TabSwitcher activeTab={activeTab} onChange={handleTabChange} />
          </div>

          {/* Price Sources Settings */}
          {activeTab !== 'deck' && (
            <div className="mb-5">
              <SourceSettingsPanel
                sources={sourceSettings.sources}
                onToggle={sourceSettings.toggleSource}
                activeCount={sourceSettings.activeCount}
              />
            </div>
          )}

          {/* Buyer Info (shared between text & browser) */}
          {activeTab !== 'deck' && (
            <div className="glass-card shimmer-border rounded-card bg-card shadow-card p-card-p mb-5">
              <BuyerInfo value={buyerName} onChange={setBuyerName} />
            </div>
          )}

          {/* Text Input Tab */}
          {activeTab === 'text' && (
            <div className="glass-card shimmer-border rounded-card bg-card shadow-card p-card-p space-y-4 mb-5">
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
          )}

          {/* Card Browser Tab */}
          {activeTab === 'browser' && (
            <div className="space-y-5 mb-5">
              <div className="glass-card shimmer-border rounded-card bg-card shadow-card p-card-p">
                <CardBrowser
                  isLoading={browser.isLoading}
                  loadError={browser.loadError}
                  searchQuery={browser.searchQuery}
                  onSearchQueryChange={browser.setSearchQuery}
                  setFilter={browser.setFilter}
                  onToggleSetFilter={browser.toggleSetFilter}
                  searchResults={browser.searchResults}
                  selectedCard={browser.selectedCard}
                  onSelectCard={browser.selectCard}
                  onClearSelection={browser.clearSelection}
                  onAddToList={handleAddToList}
                />
              </div>

              <BuildList
                items={buildList.items}
                onRemove={handleRemoveFromList}
                onSearch={handleBrowserSearch}
                onClear={handleClearBuildList}
                isSearching={isSearching}
                dualLang={dualLang}
                onDualLangChange={setDualLang}
              />
            </div>
          )}

          {/* Command Deck Tab */}
          {activeTab === 'deck' && (
            <div className="mb-5">
              <CommandDeck />
            </div>
          )}

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
                <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
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
