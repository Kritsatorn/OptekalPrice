'use client';

type Tab = 'text' | 'browser' | 'deck';

interface TabSwitcherProps {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
}

export default function TabSwitcher({ activeTab, onChange }: TabSwitcherProps) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'text', label: 'Text Input' },
    { key: 'browser', label: 'Card Browser' },
    { key: 'deck', label: 'Command Deck' },
  ];

  return (
    <div className="inline-flex rounded-full p-1 bg-muted-surface dark:bg-white/5">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`
            px-4 py-1.5 rounded-full text-[13px] font-medium transition-all
            ${activeTab === key
              ? 'bg-[var(--accent-success)] text-white shadow-sm'
              : 'text-t-muted hover:text-t-body'
            }
          `}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
