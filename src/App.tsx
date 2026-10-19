/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Deck, ReviewLog, ReviewSnapshot } from './types/anki';
import { db } from './utils/db';
import { categorizeDeckCards } from './utils/sm2';
import { Navbar, MobileBottomNav, ActiveTab } from './components/Navbar';
import { DeckList } from './components/DeckList';
import { StudySession } from './components/StudySession';
import { CardBrowser } from './components/CardBrowser';
import { StatsView } from './components/StatsView';
import { CardEditorModal } from './components/CardEditorModal';
import { DeckModal } from './components/DeckModal';
import { ImportExportModal } from './components/ImportExportModal';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [reviewLogs, setReviewLogs] = useState<ReviewLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('decks');
  const [activeDeckForStudy, setActiveDeckForStudy] = useState<Deck | null>(null);
  const [studyCards, setStudyCards] = useState<Card[]>([]);

  // Modals
  const [isCardModalOpen, setIsCardModalOpen] = useState<boolean>(false);
  const [cardToEdit, setCardToEdit] = useState<Card | null>(null);
  const [defaultDeckId, setDefaultDeckId] = useState<string | undefined>(undefined);

  const [isDeckModalOpen, setIsDeckModalOpen] = useState<boolean>(false);
  const [deckToEdit, setDeckToEdit] = useState<Deck | null>(null);

  const [isImportExportOpen, setIsImportExportOpen] = useState<boolean>(false);

  // Load data from IndexedDB
  const loadData = useCallback(async () => {
    try {
      await db.init();
      const [fetchedDecks, fetchedCards, fetchedLogs] = await Promise.all([
        db.getDecks(),
        db.getCards(),
        db.getReviewLogs(),
      ]);
      setDecks(fetchedDecks);
      setCards(fetchedCards);
      setReviewLogs(fetchedLogs);
    } catch (e) {
      console.error('Failed to load local data', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Total due cards across all decks
  const totalDueCount = useMemo(() => {
    const { totalDue } = categorizeDeckCards(cards, undefined, Date.now());
    return totalDue;
  }, [cards]);

  // Start study session for a specific deck
  const handleSelectDeck = useCallback(
    (deck: Deck) => {
      const { newCards, learningCards, reviewCards } = categorizeDeckCards(
        cards,
        deck.id,
        Date.now()
      );
      // Limit new cards per day from deck settings
      const maxNew = deck.settings?.newCardsPerDay || 20;
      const sessionQueue = [
        ...learningCards,
        ...reviewCards,
        ...newCards.slice(0, maxNew),
      ];

      if (sessionQueue.length > 0) {
        setActiveDeckForStudy(deck);
        setStudyCards(sessionQueue);
      }
    },
    [cards]
  );

  // Study all due cards across all decks
  const handleStudyAll = useCallback(() => {
    const { newCards, learningCards, reviewCards } = categorizeDeckCards(
      cards,
      undefined,
      Date.now()
    );
    const sessionQueue = [...learningCards, ...reviewCards, ...newCards.slice(0, 30)];
    if (sessionQueue.length > 0) {
      // Virtual combined deck
      const combinedDeck: Deck = {
        id: 'deck-all',
        name: 'All Due Cards',
        description: 'Combined study session across all vocabulary decks.',
        color: '#6366F1',
        defaultAudioLang: 'es-ES',
        settings: {
          newCardsPerDay: 50,
          maxReviewsPerDay: 200,
          learningSteps: [1, 10],
          graduatingInterval: 1,
          easyInterval: 4,
          startingEase: 2.5,
          easyBonus: 1.3,
          hardIntervalMultiplier: 1.2,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setActiveDeckForStudy(combinedDeck);
      setStudyCards(sessionQueue);
    }
  }, [cards]);

  const handleFinishSession = useCallback(() => {
    setActiveDeckForStudy(null);
    setStudyCards([]);
    loadData();
  }, [loadData]);

  // Card CRUD
  const handleSaveCard = useCallback(
    async (card: Card) => {
      await db.saveCard(card);
      await loadData();
    },
    [loadData]
  );

  const handleDeleteCard = useCallback(
    async (cardId: string) => {
      if (confirm('Delete this flashcard?')) {
        await db.deleteCard(cardId);
        await loadData();
      }
    },
    [loadData]
  );

  const handleUpdateCardFromReview = useCallback(
    async (card: Card) => {
      await db.saveCard(card);
      setCards((prev) => prev.map((c) => (c.id === card.id ? card : c)));
    },
    []
  );

  const handleLogReview = useCallback(
    async (log: ReviewLog) => {
      await db.addReviewLog(log);
      setReviewLogs((prev) => [...prev, log]);
    },
    []
  );

  const handleUndoLastReview = useCallback(
    async (snapshot: ReviewSnapshot) => {
      await db.saveCard(snapshot.previousCard);
      await db.deleteReviewLog(snapshot.reviewLogId);
      setCards((prev) =>
        prev.map((c) => (c.id === snapshot.previousCard.id ? snapshot.previousCard : c))
      );
      setReviewLogs((prev) => prev.filter((l) => l.id !== snapshot.reviewLogId));
    },
    []
  );

  // Deck CRUD
  const handleSaveDeck = useCallback(
    async (deck: Deck) => {
      await db.saveDeck(deck);
      await loadData();
    },
    [loadData]
  );

  const handleDeleteDeck = useCallback(
    async (deck: Deck) => {
      if (
        confirm(
          `Are you sure you want to delete deck "${deck.name}"? All cards inside this deck will also be deleted.`
        )
      ) {
        await db.deleteDeck(deck.id);
        await loadData();
      }
    },
    [loadData]
  );

  // Open modals
  const handleOpenAddCard = useCallback(
    (targetDeckId?: string) => {
      setCardToEdit(null);
      setDefaultDeckId(targetDeckId || decks[0]?.id);
      setIsCardModalOpen(true);
    },
    [decks]
  );

  const handleOpenEditCard = useCallback((card: Card) => {
    setCardToEdit(card);
    setIsCardModalOpen(true);
  }, []);

  const handleOpenCreateDeck = useCallback(() => {
    setDeckToEdit(null);
    setIsDeckModalOpen(true);
  }, []);

  const handleOpenEditDeck = useCallback((deck: Deck) => {
    setDeckToEdit(deck);
    setIsDeckModalOpen(true);
  }, []);

  // Global hotkeys (A for Add Card, D for Decks, B for Browser, S for Stats)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (activeDeckForStudy) return; // In study mode, study shortcuts take precedence

      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleOpenAddCard();
      } else if (e.key === 'd' || e.key === 'D') {
        setActiveTab('decks');
      } else if (e.key === 'b' || e.key === 'B') {
        setActiveTab('browser');
      } else if (e.key === 's' || e.key === 'S') {
        setActiveTab('stats');
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [activeDeckForStudy, handleOpenAddCard]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0D1117] text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-sm font-medium">Loading AnkiPulse SRS...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3] flex flex-col font-sans antialiased selection:bg-indigo-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveDeckForStudy(null);
          setActiveTab(tab);
        }}
        onOpenAddCard={() => handleOpenAddCard()}
        onOpenDeckModal={handleOpenCreateDeck}
        onOpenImportExport={() => setIsImportExportOpen(true)}
        totalDueCount={totalDueCount}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6">
        {activeDeckForStudy ? (
          <StudySession
            deck={activeDeckForStudy}
            initialCards={studyCards}
            allDecks={decks}
            onFinishSession={handleFinishSession}
            onUpdateCard={handleUpdateCardFromReview}
            onLogReview={handleLogReview}
            onUndoLastReview={handleUndoLastReview}
            onEditCard={handleOpenEditCard}
          />
        ) : (
          <>
            {activeTab === 'decks' && (
              <DeckList
                decks={decks}
                cards={cards}
                onSelectDeck={handleSelectDeck}
                onEditDeck={handleOpenEditDeck}
                onDeleteDeck={handleDeleteDeck}
                onCreateDeck={handleOpenCreateDeck}
                onStudyAll={handleStudyAll}
              />
            )}

            {activeTab === 'browser' && (
              <CardBrowser
                cards={cards}
                decks={decks}
                onEditCard={handleOpenEditCard}
                onDeleteCard={handleDeleteCard}
                onAddNewCard={() => handleOpenAddCard()}
              />
            )}

            {activeTab === 'stats' && (
              <StatsView cards={cards} reviewLogs={reviewLogs} />
            )}
          </>
        )}
      </main>

      {/* Mobile Floating Bottom Bar */}
      {!activeDeckForStudy && (
        <MobileBottomNav
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveDeckForStudy(null);
            setActiveTab(tab);
          }}
          onOpenAddCard={() => handleOpenAddCard()}
          totalDueCount={totalDueCount}
        />
      )}

      {/* Offline Status Badge */}
      <OfflineIndicator />

      {/* Modals */}
      {isCardModalOpen && (
        <CardEditorModal
          cardToEdit={cardToEdit}
          decks={decks}
          defaultDeckId={defaultDeckId}
          onSave={handleSaveCard}
          onClose={() => {
            setIsCardModalOpen(false);
            setCardToEdit(null);
          }}
        />
      )}

      {isDeckModalOpen && (
        <DeckModal
          deckToEdit={deckToEdit}
          onSave={handleSaveDeck}
          onClose={() => {
            setIsDeckModalOpen(false);
            setDeckToEdit(null);
          }}
        />
      )}

      {isImportExportOpen && (
        <ImportExportModal
          decks={decks}
          cards={cards}
          reviewLogs={reviewLogs}
          onRefreshData={loadData}
          onClose={() => setIsImportExportOpen(false)}
        />
      )}
    </div>
  );
}
