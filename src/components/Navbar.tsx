import React from 'react';
import { Layers, Search, BarChart3, Plus, Sliders, HardDriveDownload } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

export type ActiveTab = 'decks' | 'browser' | 'stats';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenAddCard: () => void;
  onOpenDeckModal: () => void;
  onOpenImportExport: () => void;
  totalDueCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAddCard,
  onOpenDeckModal: _onOpenDeckModal,
  onOpenImportExport,
  totalDueCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0D1117]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectTab('decks')}
            className="flex items-center gap-2.5 text-left group transition focus:outline-none"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <span className="font-black text-sm tracking-tighter text-white">AP</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-white text-base">AnkiPulse</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-1.5 py-0.2 rounded">
                  SRS
                </span>
              </div>
            </div>
          </button>

          {/* Desktop Nav Tabs */}
          <nav className="hidden md:flex items-center ml-8 gap-1">
            <button
              onClick={() => onSelectTab('decks')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'decks'
                  ? 'text-white bg-slate-800/80 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Decks</span>
              {totalDueCount > 0 && (
                <span className="ml-1 text-xs font-semibold px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {totalDueCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('browser')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'browser'
                  ? 'text-white bg-slate-800/80 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Card Browser</span>
            </button>

            <button
              onClick={() => onSelectTab('stats')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'stats'
                  ? 'text-white bg-slate-800/80 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Statistics</span>
            </button>
          </nav>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* PWA Install Button */}
          <PWAInstallButton compact />

          {/* Add Card Button */}
          <button
            onClick={onOpenAddCard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm active:scale-95"
            title="Create a new flashcard (Shortcut: A)"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Card</span>
            <span className="sm:hidden">Add</span>
          </button>

          {/* Backup / Export / Import */}
          <button
            onClick={onOpenImportExport}
            className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-white transition flex items-center gap-1.5"
            title="Import/Export Anki CSV or JSON backups"
          >
            <HardDriveDownload className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Data</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export const MobileBottomNav: React.FC<{
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenAddCard: () => void;
  totalDueCount: number;
}> = ({ activeTab, onSelectTab, onOpenAddCard, totalDueCount }) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D1117]/95 border-t border-slate-800 backdrop-blur-lg px-4 py-2 pb-safe">
      <div className="flex items-center justify-around max-w-md mx-auto">
        <button
          onClick={() => onSelectTab('decks')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-medium transition ${
            activeTab === 'decks' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Layers className="w-5 h-5" />
            {totalDueCount > 0 && (
              <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-indigo-600 text-[10px] font-bold text-white flex items-center justify-center">
                {totalDueCount > 99 ? '99+' : totalDueCount}
              </span>
            )}
          </div>
          <span className="mt-1">Decks</span>
        </button>

        <button
          onClick={onOpenAddCard}
          className="flex flex-col items-center py-1 px-3 rounded-lg text-xs font-medium text-emerald-400 hover:text-emerald-300 transition"
        >
          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
            <Plus className="w-4 h-4" />
          </div>
          <span className="mt-1">Add</span>
        </button>

        <button
          onClick={() => onSelectTab('browser')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-medium transition ${
            activeTab === 'browser' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="mt-1">Browse</span>
        </button>

        <button
          onClick={() => onSelectTab('stats')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-medium transition ${
            activeTab === 'stats' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="mt-1">Stats</span>
        </button>
      </div>
    </div>
  );
};
