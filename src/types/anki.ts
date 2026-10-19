export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  phonetic?: string;
  exampleSentence?: string;
  notes?: string;
  tags: string[];
  audioText?: string;
  audioLang?: string;
  imageUrl?: string;
  
  // SRS SM-2 Metadata
  state: CardState;
  stepIndex: number; // For learning/relearning steps (e.g. 0 -> 1m, 1 -> 10m)
  interval: number; // In days (can be 0 or fractional for learning)
  easeFactor: number; // Starts at 2.5, min 1.3
  repetitions: number; // Consecutive successful reviews
  lapses: number; // Times failed in review state
  dueDate: number; // Milliseconds timestamp
  lastReviewDate: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface DeckSettings {
  newCardsPerDay: number;
  maxReviewsPerDay: number;
  learningSteps: number[]; // In minutes, e.g. [1, 10]
  graduatingInterval: number; // In days, default 1
  easyInterval: number; // In days, default 4
  startingEase: number; // Default 2.5
  easyBonus: number; // Default 1.3
  hardIntervalMultiplier: number; // Default 1.2
}

export interface Deck {
  id: string;
  name: string; // Hierarchical decks support "::" (e.g. "Spanish::Travel")
  description: string;
  color: string;
  defaultAudioLang: string;
  settings: DeckSettings;
  createdAt: number;
  updatedAt: number;
}

export type ReviewRating = 1 | 2 | 3 | 4; // 1 = Again, 2 = Hard, 3 = Good, 4 = Easy

export interface ReviewLog {
  id: string;
  cardId: string;
  deckId: string;
  rating: ReviewRating;
  reviewTime: number; // ms timestamp
  previousState: CardState;
  newState: CardState;
  previousInterval: number;
  newInterval: number;
  previousEaseFactor: number;
  newEaseFactor: number;
  timeSpentMs: number;
}

export interface DeckQueueCounts {
  newCount: number;
  learningCount: number;
  reviewCount: number;
  totalDue: number;
  totalCards: number;
}

export interface ReviewSnapshot {
  previousCard: Card;
  reviewLogId: string;
}
