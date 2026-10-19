import { Card, CardState, DeckSettings, ReviewRating } from '../types/anki';

export const DEFAULT_DECK_SETTINGS: DeckSettings = {
  newCardsPerDay: 20,
  maxReviewsPerDay: 100,
  learningSteps: [1, 10], // In minutes
  graduatingInterval: 1, // In days
  easyInterval: 4, // In days
  startingEase: 2.5,
  easyBonus: 1.3,
  hardIntervalMultiplier: 1.2,
};

const MIN_EASE_FACTOR = 1.3;
const ONE_MINUTE_MS = 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface NextReviewOutcome {
  state: CardState;
  stepIndex: number;
  interval: number; // in days
  easeFactor: number;
  repetitions: number;
  lapses: number;
  dueDate: number;
  previewTime: string;
}

/**
 * Format duration into clean Anki-like string (e.g. "<10m", "1d", "4d", "1.2mo")
 */
export function formatIntervalPreview(days: number): string {
  if (days <= 0) return '< 1m';
  const minutes = days * 24 * 60;
  if (minutes < 1) return '< 1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = days * 24;
  if (hours < 24) return `${Math.round(hours)}h`;
  if (days < 30) return `${Math.round(days)}d`;
  const months = days / 30;
  if (months < 12) return `${months.toFixed(months < 3 ? 1 : 0)}mo`;
  const years = days / 365;
  return `${years.toFixed(1)}y`;
}

/**
 * Calculate the outcome of applying a rating to a card
 */
export function calculateNextReview(
  card: Card,
  rating: ReviewRating,
  settings: DeckSettings = DEFAULT_DECK_SETTINGS,
  now: number = Date.now()
): NextReviewOutcome {
  const steps = settings.learningSteps.length > 0 ? settings.learningSteps : [1, 10];
  const graduatingInterval = settings.graduatingInterval || 1;
  const easyInterval = settings.easyInterval || 4;
  const hardMultiplier = settings.hardIntervalMultiplier || 1.2;
  const easyBonus = settings.easyBonus || 1.3;

  let state: CardState = card.state;
  let stepIndex = card.stepIndex ?? 0;
  let interval = card.interval; // in days
  let easeFactor = card.easeFactor || settings.startingEase || 2.5;
  let repetitions = card.repetitions;
  let lapses = card.lapses;
  let delayMinutes = 1;

  if (state === 'new' || state === 'learning' || state === 'relearning') {
    switch (rating) {
      case 1: // Again
        state = 'learning';
        stepIndex = 0;
        delayMinutes = steps[0] || 1;
        interval = delayMinutes / (24 * 60);
        easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2);
        break;

      case 2: // Hard
        state = 'learning';
        // Average between step 0 and next step, or repeat current
        const nextStepMin = steps[Math.min(stepIndex + 1, steps.length - 1)] || 10;
        const currStepMin = steps[stepIndex] || 1;
        delayMinutes = Math.max(1, Math.round((currStepMin + nextStepMin) / 2));
        interval = delayMinutes / (24 * 60);
        easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.15);
        break;

      case 3: // Good
        if (stepIndex + 1 < steps.length) {
          // Advance to next learning step
          stepIndex += 1;
          delayMinutes = steps[stepIndex];
          interval = delayMinutes / (24 * 60);
          state = 'learning';
        } else {
          // Graduate to review!
          state = 'review';
          stepIndex = 0;
          interval = graduatingInterval; // e.g. 1 day
          repetitions = 1;
        }
        break;

      case 4: // Easy
        // Graduate immediately with bonus
        state = 'review';
        stepIndex = 0;
        interval = easyInterval; // e.g. 4 days
        easeFactor += 0.15;
        repetitions = 1;
        break;
    }
  } else {
    // Card is in 'review' state (Graduated)
    switch (rating) {
      case 1: // Again (Lapse)
        state = 'relearning';
        stepIndex = 0;
        lapses += 1;
        repetitions = 0;
        easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2);
        delayMinutes = steps[0] || 10;
        interval = delayMinutes / (24 * 60);
        break;

      case 2: // Hard
        easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.15);
        // Slightly increases interval
        interval = Math.max(1, Math.round(interval * hardMultiplier));
        repetitions += 1;
        break;

      case 3: // Good
        if (repetitions === 1) {
          interval = 6; // Anki standard 2nd review leap
        } else {
          interval = Math.max(1, Math.round(interval * easeFactor));
        }
        repetitions += 1;
        break;

      case 4: // Easy
        easeFactor += 0.15;
        if (repetitions === 1) {
          interval = Math.max(1, Math.round(easyInterval * easyBonus));
        } else {
          interval = Math.max(1, Math.round(interval * easeFactor * easyBonus));
        }
        repetitions += 1;
        break;
    }
  }

  // Calculate Due Date
  let dueDate: number;
  if (state === 'learning' || state === 'relearning') {
    dueDate = now + delayMinutes * ONE_MINUTE_MS;
  } else {
    // Review card interval in days: due interval days from now
    dueDate = now + Math.round(interval * ONE_DAY_MS);
  }

  // Format preview label
  let previewTime: string;
  if (state === 'learning' || state === 'relearning') {
    previewTime = delayMinutes < 60 ? `< ${delayMinutes}m` : `${Math.round(delayMinutes / 60)}h`;
  } else {
    previewTime = formatIntervalPreview(interval);
  }

  return {
    state,
    stepIndex,
    interval,
    easeFactor: Number(easeFactor.toFixed(2)),
    repetitions,
    lapses,
    dueDate,
    previewTime,
  };
}

/**
 * Get previews for all 4 ratings (Again, Hard, Good, Easy) for a card
 */
export function getRatingPreviews(
  card: Card,
  settings: DeckSettings = DEFAULT_DECK_SETTINGS,
  now: number = Date.now()
): Record<ReviewRating, NextReviewOutcome> {
  return {
    1: calculateNextReview(card, 1, settings, now),
    2: calculateNextReview(card, 2, settings, now),
    3: calculateNextReview(card, 3, settings, now),
    4: calculateNextReview(card, 4, settings, now),
  };
}

/**
 * Filter cards for a deck into New, Learning, and Review queues
 */
export function categorizeDeckCards(
  cards: Card[],
  deckId?: string,
  now: number = Date.now()
) {
  const filtered = deckId ? cards.filter((c) => c.deckId === deckId) : cards;
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const endOfDayMs = todayEnd.getTime();

  const newCards: Card[] = [];
  const learningCards: Card[] = [];
  const reviewCards: Card[] = [];

  for (const card of filtered) {
    if (card.state === 'new') {
      newCards.push(card);
    } else if (card.state === 'learning' || card.state === 'relearning') {
      if (card.dueDate <= endOfDayMs) {
        learningCards.push(card);
      }
    } else if (card.state === 'review') {
      if (card.dueDate <= endOfDayMs) {
        reviewCards.push(card);
      }
    }
  }

  return {
    newCards,
    learningCards,
    reviewCards,
    totalDue: newCards.length + learningCards.length + reviewCards.length,
    totalCards: filtered.length,
  };
}
