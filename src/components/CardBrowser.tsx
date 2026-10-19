import React, { useState, useMemo } from 'react';
import { Search, Filter, Plus, Trash2, Edit3, Volume2, ArrowUpDown, Calendar, HelpCircle } from 'lucide-react';
import { Card, CardState, Deck } from '../types/anki';
import { formatIntervalPreview } from '../utils/sm2';
import { TTSService } from '../utils/tts';

interface CardBrowserProps {
  cards: Card[];
  decks: Deck[];
  onEditCard: (card: Card) => void;
  onDeleteCard: (cardId: string) => void;
  onAddNewCard: () => void;
}

export const CardBrowser: React.FC<CardBrowserProps> = ({
  cards,
  decks,
  onEditCard,
  onDeleteCard,
  onAddNewCard,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeckId, setSelectedDeckId] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'due' | 'created' | 'interval' | 'front'>('due');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Deck map for quick lookup
  const deckMap = useMemo(() => {
    const map = new Map<string, Deck>();
    decks.forEach((d) => map.set(d.id, d));
    return map;
  }, [decks]);

  // Filtered and sorted cards
  const filteredCards = useMemo(() => {
    let result = cards.filter((card) => {
      // Deck filter
      if (selectedDeckId !== 'all' && card.deckId !== selectedDeckId) return false;

      // State filter
      if (selectedState !== 'all' && card.state !== selectedState) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchFront = card.front.toLowerCase().includes(q);
        const matchBack = card.back.toLowerCase().includes(q);
        const matchNotes = card.notes?.toLowerCase().includes(q);
        const matchPhonetic = card.phonetic?.toLowerCase().includes(q);
        const matchTags = card.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchFront && !matchBack && !matchNotes && !matchPhonetic && !matchTags) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'due') {
        diff = a.dueDate - b.dueDate;
      } else if (sortBy === 'created') {
        diff = a.createdAt - b.createdAt;
      } else if (sortBy === 'interval') {
        diff = a.interval - b.interval;
      } else if (sortBy === 'front') {
        diff = a.front.localeCompare(b.front);
      }
      return sortOrder === 'asc' ? diff : -diff;
    });

    return result;
  }, [cards, selectedDeckId, selectedState, searchQuery, sortBy, sortOrder]);

  const toggleSort = (field: 'due' | 'created' | 'interval' | 'front') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const formatDueDate = (timestamp: number) => {
    const now = Date.now();
    const diffHours = (timestamp - now) / (1000 * 60 * 60);

    if (diffHours < 0 && Math.abs(diffHours) < 24) {
      return <span className="text-rose-400 font-medium">Due Now</span>;
    }
    if (diffHours < 0) {
      return <span className="text-rose-400 font-medium">Overdue ({Math.round(Math.abs(diffHours) / 24)}d)</span>;
    }
    if (diffHours < 24) {
      return <span className="text-amber-400 font-medium">Today</span>;
    }
    const days = Math.round(diffHours / 24);
    return <span className="text-slate-400">in {days}d</span>;
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Header controls */}
      <div className="rounded-2xl border border-slate-800 bg-[#161B22] p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Card Browser</h1>
            <p className="text-xs text-slate-400">
              Search, filter, and inspect SRS scheduling metadata across all {cards.length} cards.
            </p>
          </div>

          <button
            onClick={onAddNewCard}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition active:scale-95 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Card</span>
          </button>
        </div>

        {/* Search Bar & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search words, definitions, tags..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0D1117] border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Deck select */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#0D1117] border border-slate-700/80 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Decks ({decks.length})</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* State select */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#0D1117] border border-slate-700/80 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Card States</option>
              <option value="new">New</option>
              <option value="learning">Learning</option>
              <option value="review">Review</option>
              <option value="relearning">Relearning</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards Table */}
      <div className="rounded-xl border border-slate-800 bg-[#161B22] overflow-hidden shadow-md">
        {filteredCards.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <HelpCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="text-sm font-medium">No cards matched your filter criteria.</p>
            <p className="text-xs text-slate-500 mt-1">Try clearing your search query or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0D1117]/60 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                  <th
                    onClick={() => toggleSort('front')}
                    className="py-3 px-4 font-semibold cursor-pointer hover:text-white"
                  >
                    <div className="flex items-center gap-1">
                      <span>Front (Question)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-semibold">Back (Answer)</th>
                  <th className="py-3 px-4 font-semibold hidden md:table-cell">Deck</th>
                  <th
                    onClick={() => toggleSort('due')}
                    className="py-3 px-4 font-semibold cursor-pointer hover:text-white text-right"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Due</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('interval')}
                    className="py-3 px-4 font-semibold cursor-pointer hover:text-white text-right hidden sm:table-cell"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Interval</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-semibold text-right hidden sm:table-cell">Ease</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCards.map((card) => {
                  const deck = deckMap.get(card.deckId);
                  const cleanFront = card.front.replace(/\{\{c\d+::(.*?)\}\}/g, '$1');

                  return (
                    <tr
                      key={card.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Front with Audio trigger */}
                      <td className="py-3 px-4 max-w-[200px] sm:max-w-xs">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const text = card.audioText || card.front;
                              const lang = card.audioLang || deck?.defaultAudioLang || 'en-US';
                              TTSService.speak(text, lang);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-cyan-400 shrink-0 transition"
                            title="Pronounce"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-medium text-white truncate block">
                            {cleanFront}
                          </span>
                        </div>
                        {card.tags.length > 0 && (
                          <div className="text-[10px] text-slate-500 truncate mt-0.5 pl-6">
                            {card.tags.join(', ')}
                          </div>
                        )}
                      </td>

                      {/* Back */}
                      <td className="py-3 px-4 text-slate-300 max-w-[200px] sm:max-w-sm truncate">
                        {card.back.replace(/\n/g, ' ')}
                      </td>

                      {/* Deck */}
                      <td className="py-3 px-4 text-xs text-slate-400 hidden md:table-cell truncate max-w-[140px]">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: deck?.color || '#6366F1' }}
                          />
                          <span className="truncate">{deck?.name.split('::').pop() || 'Deck'}</span>
                        </span>
                      </td>

                      {/* Due */}
                      <td className="py-3 px-4 text-right font-mono text-xs whitespace-nowrap">
                        {formatDueDate(card.dueDate)}
                      </td>

                      {/* Interval */}
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-400 hidden sm:table-cell whitespace-nowrap">
                        {formatIntervalPreview(card.interval)}
                      </td>

                      {/* Ease Factor */}
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-400 hidden sm:table-cell whitespace-nowrap">
                        {card.easeFactor ? `${Math.round(card.easeFactor * 100)}%` : '250%'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditCard(card)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition"
                            title="Edit Card"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteCard(card.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="Delete Card"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
