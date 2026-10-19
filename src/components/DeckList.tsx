import React from 'react';
import { Play, Settings, Plus, Folder, Trash2, Edit3, Volume2 } from 'lucide-react';
import { Card, Deck } from '../types/anki';
import { categorizeDeckCards } from '../utils/sm2';
import { TTSService } from '../utils/tts';

interface DeckListProps {
  decks: Deck[];
  cards: Card[];
  onSelectDeck: (deck: Deck) => void;
  onEditDeck: (deck: Deck) => void;
  onDeleteDeck: (deck: Deck) => void;
  onCreateDeck: () => void;
  onStudyAll: () => void;
}

export const DeckList: React.FC<DeckListProps> = ({
  decks,
  cards,
  onSelectDeck,
  onEditDeck,
  onDeleteDeck,
  onCreateDeck,
  onStudyAll,
}) => {
  const now = Date.now();

  // Calculate stats for all decks
  const deckStats = decks.map((deck) => {
    const counts = categorizeDeckCards(cards, deck.id, now);
    return {
      deck,
      ...counts,
    };
  });

  const totalNew = deckStats.reduce((sum, d) => sum + d.newCards.length, 0);
  const totalLearning = deckStats.reduce((sum, d) => sum + d.learningCards.length, 0);
  const totalReview = deckStats.reduce((sum, d) => sum + d.reviewCards.length, 0);
  const totalDue = totalNew + totalLearning + totalReview;
  const totalCards = cards.length;

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Banner / Summary */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#161B22] to-[#12161D] p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Deck Collection</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              SM-2 Spaced Repetition engine actively tracking {totalCards} cards across {decks.length} decks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCreateDeck}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 text-white transition active:scale-95"
            >
              <Plus className="w-4 h-4 text-slate-300" />
              <span>Create Deck</span>
            </button>

            {totalDue > 0 && (
              <button
                onClick={onStudyAll}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Study All ({totalDue})</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Anki Queue Counter */}
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-800/80 pt-4">
          <div className="flex flex-col items-center sm:items-start p-2.5 rounded-xl bg-[#0D1117]/60 border border-slate-800/60">
            <span className="text-xs font-medium text-blue-400">New Due</span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-blue-400 mt-0.5">
              {totalNew}
            </span>
          </div>

          <div className="flex flex-col items-center sm:items-start p-2.5 rounded-xl bg-[#0D1117]/60 border border-slate-800/60">
            <span className="text-xs font-medium text-rose-400">Learning Due</span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-rose-400 mt-0.5">
              {totalLearning}
            </span>
          </div>

          <div className="flex flex-col items-center sm:items-start p-2.5 rounded-xl bg-[#0D1117]/60 border border-slate-800/60">
            <span className="text-xs font-medium text-emerald-400">Review Due</span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-0.5">
              {totalReview}
            </span>
          </div>
        </div>
      </div>

      {/* Decks Table / List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Active Decks
          </h2>
          <div className="hidden sm:flex items-center gap-6 text-xs font-mono font-medium text-slate-400 pr-20">
            <span className="text-blue-400 w-12 text-right">New</span>
            <span className="text-rose-400 w-12 text-right">Learn</span>
            <span className="text-emerald-400 w-12 text-right">Review</span>
          </div>
        </div>

        {decks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center">
            <Folder className="mx-auto w-10 h-10 text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-white">No decks available</h3>
            <p className="mt-1 text-sm text-slate-400 max-w-sm mx-auto">
              Create your first deck or import an existing vocabulary list to begin studying with SM-2.
            </p>
            <button
              onClick={onCreateDeck}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Deck</span>
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {deckStats.map(({ deck, newCards, learningCards, reviewCards, totalDue, totalCards }) => {
              const nameParts = deck.name.split('::');
              const isSubdeck = nameParts.length > 1;

              return (
                <div
                  key={deck.id}
                  className="group relative rounded-xl border border-slate-800/90 bg-[#161B22]/90 hover:bg-[#1C212B] transition-all duration-150 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Left: Deck Info */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className="w-3 self-stretch rounded-full shrink-0"
                      style={{ backgroundColor: deck.color || '#6366F1' }}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {isSubdeck && (
                          <span className="text-xs text-slate-500 font-mono">
                            {nameParts.slice(0, -1).join(' / ')} /
                          </span>
                        )}
                        <h3
                          onClick={() => onSelectDeck(deck)}
                          className="font-semibold text-white hover:text-indigo-400 cursor-pointer text-base sm:text-lg tracking-tight truncate transition"
                        >
                          {nameParts[nameParts.length - 1]}
                        </h3>

                        {deck.defaultAudioLang && (
                          <button
                            onClick={() => TTSService.speak(nameParts[nameParts.length - 1], deck.defaultAudioLang)}
                            title={`Audio TTS configured (${deck.defaultAudioLang})`}
                            className="p-1 text-slate-400 hover:text-slate-200 transition"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {deck.description && (
                        <p className="mt-1 text-xs sm:text-sm text-slate-400 line-clamp-1">
                          {deck.description}
                        </p>
                      )}

                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <span>{totalCards} total cards</span>
                        <span aria-hidden="true">·</span>
                        <span>{deck.settings.newCardsPerDay} new/day limit</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Anki 3-Counter badges */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                    <div className="flex items-center gap-3 sm:gap-6 font-mono font-semibold text-sm">
                      <div className="flex items-center gap-1.5 sm:w-12 sm:justify-end" title="New Cards Due">
                        <span className="sm:hidden text-xs text-slate-500 font-sans">New:</span>
                        <span className={newCards.length > 0 ? 'text-blue-400' : 'text-slate-600'}>
                          {newCards.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 sm:w-12 sm:justify-end" title="Learning Cards Due">
                        <span className="sm:hidden text-xs text-slate-500 font-sans">Learn:</span>
                        <span className={learningCards.length > 0 ? 'text-rose-400' : 'text-slate-600'}>
                          {learningCards.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 sm:w-12 sm:justify-end" title="Review Cards Due">
                        <span className="sm:hidden text-xs text-slate-500 font-sans">Rev:</span>
                        <span className={reviewCards.length > 0 ? 'text-emerald-400' : 'text-slate-600'}>
                          {reviewCards.length}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onSelectDeck(deck)}
                        disabled={totalDue === 0}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition active:scale-95 ${
                          totalDue > 0
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Study</span>
                      </button>

                      <button
                        onClick={() => onEditDeck(deck)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                        title="Deck Settings"
                      >
                        <Settings className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDeleteDeck(deck)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Delete Deck"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
