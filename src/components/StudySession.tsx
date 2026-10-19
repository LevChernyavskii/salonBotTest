import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Volume2,
  RotateCcw,
  Undo2,
  Edit3,
  X,
  CheckCircle2,
  Layers,
  Sparkles,
  ArrowRight,
  Eye,
  Settings2,
} from 'lucide-react';
import { Card, Deck, ReviewLog, ReviewRating, ReviewSnapshot } from '../types/anki';
import { calculateNextReview, getRatingPreviews } from '../utils/sm2';
import { TTSService } from '../utils/tts';
import { renderClozeBack, renderClozeFront, sanitizeHtml } from '../utils/textFormatter';

interface StudySessionProps {
  deck: Deck;
  initialCards: Card[];
  allDecks: Deck[];
  onFinishSession: () => void;
  onUpdateCard: (card: Card) => Promise<void>;
  onLogReview: (log: ReviewLog) => Promise<void>;
  onUndoLastReview?: (snapshot: ReviewSnapshot) => Promise<void>;
  onEditCard: (card: Card) => void;
}

export const StudySession: React.FC<StudySessionProps> = ({
  deck,
  initialCards,
  allDecks: _allDecks,
  onFinishSession,
  onUpdateCard,
  onLogReview,
  onUndoLastReview,
  onEditCard,
}) => {
  // Session queues
  const [queue, setQueue] = useState<Card[]>(() => [...initialCards]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);
  const [historySnapshots, setHistorySnapshots] = useState<ReviewSnapshot[]>([]);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [autoplayAudio, setAutoplayAudio] = useState<boolean>(true);
  const [sessionStats, setSessionStats] = useState<{
    again: number;
    hard: number;
    good: number;
    easy: number;
    total: number;
  }>({ again: 0, hard: 0, good: 0, easy: 0, total: 0 });

  const currentCard = queue[currentIndex] || null;

  // Real-time queue counters
  const counters = useMemo(() => {
    let newCount = 0;
    let learnCount = 0;
    let reviewCount = 0;
    for (let i = currentIndex; i < queue.length; i++) {
      const c = queue[i];
      if (c.state === 'new') newCount++;
      else if (c.state === 'learning' || c.state === 'relearning') learnCount++;
      else reviewCount++;
    }
    return { newCount, learnCount, reviewCount, remaining: queue.length - currentIndex };
  }, [queue, currentIndex]);

  // Audio speech trigger
  const playAudio = useCallback(() => {
    if (!currentCard) return;
    const textToSpeak = currentCard.audioText || currentCard.front;
    const lang = currentCard.audioLang || deck.defaultAudioLang || 'en-US';
    TTSService.speak(textToSpeak, lang);
  }, [currentCard, deck.defaultAudioLang]);

  // Autoplay audio on new card front load
  useEffect(() => {
    if (currentCard && autoplayAudio) {
      playAudio();
    }
    setStartTime(Date.now());
  }, [currentCard?.id, autoplayAudio, playAudio]);

  // Dynamic preview calculations for the 4 buttons
  const previews = useMemo(() => {
    if (!currentCard) return null;
    return getRatingPreviews(currentCard, deck.settings);
  }, [currentCard, deck.settings]);

  // Handle rating response
  const handleRate = useCallback(
    async (rating: ReviewRating) => {
      if (!currentCard || !previews) return;

      const timeSpentMs = Date.now() - startTime;
      const outcome = previews[rating];

      // Build updated card
      const updatedCard: Card = {
        ...currentCard,
        state: outcome.state,
        stepIndex: outcome.stepIndex,
        interval: outcome.interval,
        easeFactor: outcome.easeFactor,
        repetitions: outcome.repetitions,
        lapses: outcome.lapses,
        dueDate: outcome.dueDate,
        lastReviewDate: Date.now(),
        updatedAt: Date.now(),
      };

      const reviewLog: ReviewLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        cardId: currentCard.id,
        deckId: currentCard.deckId,
        rating,
        reviewTime: Date.now(),
        previousState: currentCard.state,
        newState: outcome.state,
        previousInterval: currentCard.interval,
        newInterval: outcome.interval,
        previousEaseFactor: currentCard.easeFactor,
        newEaseFactor: outcome.easeFactor,
        timeSpentMs,
      };

      // Store undo snapshot
      setHistorySnapshots((prev) => [
        ...prev,
        { previousCard: { ...currentCard }, reviewLogId: reviewLog.id },
      ]);

      // Update session stats
      setSessionStats((prev) => ({
        ...prev,
        total: prev.total + 1,
        again: rating === 1 ? prev.again + 1 : prev.again,
        hard: rating === 2 ? prev.hard + 1 : prev.hard,
        good: rating === 3 ? prev.good + 1 : prev.good,
        easy: rating === 4 ? prev.easy + 1 : prev.easy,
      }));

      // Commit to DB
      await onUpdateCard(updatedCard);
      await onLogReview(reviewLog);

      // In Anki: if rated "Again" (1) or card is still in learning step, re-queue at the end of the session queue!
      if (outcome.state === 'learning' || outcome.state === 'relearning' || rating === 1) {
        setQueue((prev) => [...prev, updatedCard]);
      }

      setIsAnswerRevealed(false);
      setCurrentIndex((prev) => prev + 1);
    },
    [currentCard, previews, startTime, onUpdateCard, onLogReview]
  );

  // Undo last review
  const handleUndo = useCallback(async () => {
    if (historySnapshots.length === 0) return;
    const lastSnapshot = historySnapshots[historySnapshots.length - 1];
    if (!lastSnapshot) return;

    await onUpdateCard(lastSnapshot.previousCard);
    if (onUndoLastReview) {
      await onUndoLastReview(lastSnapshot);
    }

    setHistorySnapshots((prev) => prev.slice(0, -1));

    // Rewind index
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsAnswerRevealed(false);
    }
  }, [historySnapshots, currentIndex, onUpdateCard, onUndoLastReview]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Space or Enter: Show Answer if hidden; Good if revealed
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (!isAnswerRevealed) {
          setIsAnswerRevealed(true);
        } else {
          handleRate(3); // Default Good
        }
      }

      // 1: Again
      if (e.key === '1') {
        e.preventDefault();
        if (isAnswerRevealed) handleRate(1);
      }
      // 2: Hard
      if (e.key === '2') {
        e.preventDefault();
        if (isAnswerRevealed) handleRate(2);
      }
      // 3: Good
      if (e.key === '3') {
        e.preventDefault();
        if (isAnswerRevealed) handleRate(3);
      }
      // 4: Easy
      if (e.key === '4') {
        e.preventDefault();
        if (isAnswerRevealed) handleRate(4);
      }

      // R: Replay Audio
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        playAudio();
      }

      // E: Edit Current Card
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        if (currentCard) onEditCard(currentCard);
      }

      // Z or Ctrl+Z: Undo
      if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswerRevealed, currentCard, handleRate, handleUndo, onEditCard, playAudio]);

  // Session Completed Screen
  if (!currentCard || currentIndex >= queue.length) {
    return (
      <div className="max-w-xl mx-auto my-8 p-6 sm:p-8 rounded-2xl border border-slate-800 bg-[#161B22] shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-bold text-white tracking-tight">Congratulations!</h2>
        <p className="mt-2 text-sm text-slate-400">
          You have finished all due cards in <span className="text-indigo-400 font-semibold">{deck.name}</span> for now.
        </p>

        {/* Session Stats Breakdown */}
        <div className="mt-6 p-4 rounded-xl bg-[#0D1117] border border-slate-800/80">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
            Session Performance Summary
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <span className="block text-xs text-rose-400 font-medium">Again</span>
              <span className="text-lg font-bold font-mono text-rose-400">{sessionStats.again}</span>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="block text-xs text-amber-400 font-medium">Hard</span>
              <span className="text-lg font-bold font-mono text-amber-400">{sessionStats.hard}</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="block text-xs text-emerald-400 font-medium">Good</span>
              <span className="text-lg font-bold font-mono text-emerald-400">{sessionStats.good}</span>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <span className="block text-xs text-blue-400 font-medium">Easy</span>
              <span className="text-lg font-bold font-mono text-blue-400">{sessionStats.easy}</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400 flex justify-between items-center px-1">
            <span>Total Reviews: <strong className="text-white">{sessionStats.total}</strong></span>
            <span>
              Retention Rate:{' '}
              <strong className="text-emerald-400">
                {sessionStats.total > 0
                  ? Math.round(((sessionStats.good + sessionStats.easy) / sessionStats.total) * 100)
                  : 100}
                %
              </strong>
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onFinishSession}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white shadow-lg shadow-indigo-600/30 transition active:scale-95"
          >
            Back to Deck List
          </button>
        </div>
      </div>
    );
  }

  const progressPercentage = Math.round((currentIndex / queue.length) * 100);

  return (
    <div className="max-w-3xl mx-auto pb-24 md:pb-12">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between py-3 px-1 border-b border-slate-800/80 mb-4">
        {/* Left: Deck title and undo */}
        <div className="flex items-center gap-2">
          <button
            onClick={onFinishSession}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Exit Study Session"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <span className="text-xs text-slate-500 block truncate max-w-[140px] sm:max-w-xs">
              {deck.name}
            </span>
            <div className="flex items-center gap-2 text-xs font-mono font-medium">
              <span className="text-blue-400" title="New cards in queue">
                {counters.newCount}
              </span>
              <span className="text-rose-400" title="Learning cards in queue">
                {counters.learnCount}
              </span>
              <span className="text-emerald-400" title="Review cards in queue">
                {counters.reviewCount}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Controls & Undo */}
        <div className="flex items-center gap-2">
          {/* Autoplay Audio toggle */}
          <button
            onClick={() => setAutoplayAudio(!autoplayAudio)}
            className={`p-1.5 rounded-lg transition ${
              autoplayAudio
                ? 'text-cyan-400 bg-cyan-500/10'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title={`Autoplay Audio: ${autoplayAudio ? 'ON' : 'OFF'}`}
          >
            <Volume2 className="w-4 h-4" />
          </button>

          {/* Edit current card */}
          <button
            onClick={() => onEditCard(currentCard)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Edit Card (Shortcut: E)"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          {/* Undo Button */}
          <button
            onClick={handleUndo}
            disabled={historySnapshots.length === 0}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
              historySnapshots.length > 0
                ? 'text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Undo last review (Shortcut: Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Undo</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800/80 rounded-full h-1.5 mb-6 overflow-hidden">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Flashcard Box */}
      <div
        onClick={() => {
          if (!isAnswerRevealed) setIsAnswerRevealed(true);
        }}
        className="relative min-h-[340px] sm:min-h-[400px] rounded-2xl border border-slate-700/80 bg-gradient-to-b from-[#181D26] to-[#12161E] p-6 sm:p-10 shadow-2xl flex flex-col justify-between transition-all duration-200 cursor-pointer select-text"
      >
        {/* Card Header Metadata (Zero-pill discipline) */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="uppercase font-semibold tracking-wider text-[11px] text-slate-400">
              {currentCard.state === 'new'
                ? 'New Card'
                : currentCard.state === 'learning' || currentCard.state === 'relearning'
                ? 'Learning'
                : 'Review'}
            </span>
            {currentCard.tags.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate max-w-[200px]">
                  {currentCard.tags.join(', ')}
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playAudio();
            }}
            className="flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition p-1"
            title="Listen to audio (Shortcut: R)"
          >
            <Volume2 className="w-4 h-4" />
            <span className="text-[11px] font-mono">Audio (R)</span>
          </button>
        </div>

        {/* Card Front Content */}
        <div className="my-auto py-6 text-center">
          <div
            className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-relaxed select-text"
            dangerouslySetInnerHTML={{
              __html: isAnswerRevealed
                ? renderClozeBack(sanitizeHtml(currentCard.front))
                : renderClozeFront(sanitizeHtml(currentCard.front)),
            }}
          />

          {/* Phonetic Pronunciation Guide if provided */}
          {currentCard.phonetic && (
            <div className="mt-3 text-sm sm:text-base font-mono text-cyan-400/90 tracking-wide">
              /{currentCard.phonetic}/
            </div>
          )}

          {/* Optional Image */}
          {currentCard.imageUrl && (
            <div className="mt-4 flex justify-center">
              <img
                src={currentCard.imageUrl}
                alt="Card attachment"
                className="max-h-48 rounded-xl object-contain border border-slate-700/60 shadow-md"
              />
            </div>
          )}
        </div>

        {/* Card Back Content (Revealed on click/Space) */}
        {isAnswerRevealed && (
          <div className="pt-6 border-t border-slate-700/70 text-center animate-in fade-in duration-150">
            {/* Translation / Definition / Back */}
            <div
              className="text-lg sm:text-2xl font-semibold text-emerald-300 leading-relaxed whitespace-pre-line"
              dangerouslySetInnerHTML={{
                __html: renderClozeBack(sanitizeHtml(currentCard.back)),
              }}
            />

            {/* Example sentence */}
            {currentCard.exampleSentence && (
              <div className="mt-4 p-3 rounded-xl bg-[#0D1117]/80 border border-slate-800 text-left">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block mb-1">
                  Example Context
                </span>
                <p
                  className="text-sm text-slate-300 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(currentCard.exampleSentence),
                  }}
                />
              </div>
            )}

            {/* Notes */}
            {currentCard.notes && (
              <div className="mt-2 text-xs text-slate-400 text-left px-1">
                <strong className="text-slate-300">Note:</strong> {currentCard.notes}
              </div>
            )}
          </div>
        )}

        {/* Bottom Helper Hint */}
        <div className="text-center pt-4 text-xs text-slate-500 select-none">
          {!isAnswerRevealed ? (
            <span>Tap card or press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Space</kbd> to reveal answer</span>
          ) : (
            <span className="hidden sm:inline">Use keyboard shortcuts <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">1</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">2</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">3</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">4</kbd></span>
          )}
        </div>
      </div>

      {/* Answer & Rating Buttons */}
      <div className="mt-6">
        {!isAnswerRevealed ? (
          <button
            onClick={() => setIsAnswerRevealed(true)}
            className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] font-bold text-white text-base shadow-xl shadow-indigo-600/25 transition flex items-center justify-center gap-2"
          >
            <Eye className="w-5 h-5" />
            <span>Show Answer</span>
            <kbd className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs rounded bg-indigo-700/60 font-mono text-indigo-200">
              Space
            </kbd>
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {/* 1: Again */}
            <button
              onClick={() => handleRate(1)}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#221517] hover:bg-[#2F1B1E] border border-rose-500/40 text-rose-300 transition active:scale-95 group shadow-sm"
            >
              <span className="text-[11px] sm:text-xs font-mono text-rose-400/80 mb-0.5">
                {previews?.[1]?.previewTime || '< 10m'}
              </span>
              <span className="text-sm sm:text-base font-bold text-rose-200 group-hover:text-white">
                Again
              </span>
              <kbd className="mt-1 hidden sm:inline-block px-1.5 py-0.2 rounded bg-rose-950/80 border border-rose-800/40 text-[10px] font-mono text-rose-300">
                1
              </kbd>
            </button>

            {/* 2: Hard */}
            <button
              onClick={() => handleRate(2)}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#241E14] hover:bg-[#322A1B] border border-amber-500/40 text-amber-300 transition active:scale-95 group shadow-sm"
            >
              <span className="text-[11px] sm:text-xs font-mono text-amber-400/80 mb-0.5">
                {previews?.[2]?.previewTime || '1d'}
              </span>
              <span className="text-sm sm:text-base font-bold text-amber-200 group-hover:text-white">
                Hard
              </span>
              <kbd className="mt-1 hidden sm:inline-block px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-800/40 text-[10px] font-mono text-amber-300">
                2
              </kbd>
            </button>

            {/* 3: Good */}
            <button
              onClick={() => handleRate(3)}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#13221C] hover:bg-[#1B3228] border border-emerald-500/50 text-emerald-300 transition active:scale-95 group shadow-md"
            >
              <span className="text-[11px] sm:text-xs font-mono text-emerald-400/90 mb-0.5">
                {previews?.[3]?.previewTime || '3d'}
              </span>
              <span className="text-sm sm:text-base font-bold text-emerald-200 group-hover:text-white">
                Good
              </span>
              <kbd className="mt-1 hidden sm:inline-block px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-800/40 text-[10px] font-mono text-emerald-300">
                3 / Space
              </kbd>
            </button>

            {/* 4: Easy */}
            <button
              onClick={() => handleRate(4)}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#14212D] hover:bg-[#1C2F40] border border-cyan-500/40 text-cyan-300 transition active:scale-95 group shadow-sm"
            >
              <span className="text-[11px] sm:text-xs font-mono text-cyan-400/80 mb-0.5">
                {previews?.[4]?.previewTime || '6d'}
              </span>
              <span className="text-sm sm:text-base font-bold text-cyan-200 group-hover:text-white">
                Easy
              </span>
              <kbd className="mt-1 hidden sm:inline-block px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-800/40 text-[10px] font-mono text-cyan-300">
                4
              </kbd>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
