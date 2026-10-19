import { Card, Deck, ReviewLog } from '../types/anki';
import { INITIAL_CARDS, INITIAL_DECKS } from './seedData';

const DB_NAME = 'ankipulse_db';
const DB_VERSION = 1;

const STORE_DECKS = 'decks';
const STORE_CARDS = 'cards';
const STORE_LOGS = 'review_logs';

class Database {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isIDBAvailable: boolean = typeof window !== 'undefined' && 'indexedDB' in window;

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (!this.isIDBAvailable) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_DECKS)) {
          db.createObjectStore(STORE_DECKS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_CARDS)) {
          const cardStore = db.createObjectStore(STORE_CARDS, { keyPath: 'id' });
          cardStore.createIndex('deckId', 'deckId', { unique: false });
          cardStore.createIndex('dueDate', 'dueDate', { unique: false });
          cardStore.createIndex('state', 'state', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_LOGS)) {
          const logStore = db.createObjectStore(STORE_LOGS, { keyPath: 'id' });
          logStore.createIndex('cardId', 'cardId', { unique: false });
          logStore.createIndex('deckId', 'deckId', { unique: false });
          logStore.createIndex('reviewTime', 'reviewTime', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // --- LOCALSTORAGE FALLBACK HELPERS ---
  private getLocal<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(`ankipulse_${key}`);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private setLocal<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`ankipulse_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('localStorage save failed', e);
    }
  }

  // --- INITIALIZATION ---
  async init(): Promise<void> {
    const decks = await this.getDecks();
    if (decks.length === 0) {
      // Seed default decks & cards
      for (const d of INITIAL_DECKS) {
        await this.saveDeck(d);
      }
      for (const c of INITIAL_CARDS) {
        await this.saveCard(c);
      }
    }
  }

  // --- DECKS ---
  async getDecks(): Promise<Deck[]> {
    if (!this.isIDBAvailable) {
      return this.getLocal<Deck[]>('decks', []);
    }
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_DECKS, 'readonly');
        const store = tx.objectStore(STORE_DECKS);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return this.getLocal<Deck[]>('decks', []);
    }
  }

  async saveDeck(deck: Deck): Promise<void> {
    if (!this.isIDBAvailable) {
      const list = this.getLocal<Deck[]>('decks', []);
      const idx = list.findIndex((d) => d.id === deck.id);
      if (idx >= 0) list[idx] = deck;
      else list.push(deck);
      this.setLocal('decks', list);
      return;
    }
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DECKS, 'readwrite');
      const store = tx.objectStore(STORE_DECKS);
      store.put(deck);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteDeck(deckId: string): Promise<void> {
    if (!this.isIDBAvailable) {
      let list = this.getLocal<Deck[]>('decks', []);
      list = list.filter((d) => d.id !== deckId);
      this.setLocal('decks', list);
      return;
    }
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_DECKS, STORE_CARDS], 'readwrite');
      tx.objectStore(STORE_DECKS).delete(deckId);

      // Also cascade delete cards for this deck
      const cardStore = tx.objectStore(STORE_CARDS);
      const req = cardStore.getAll();
      req.onsuccess = () => {
        const cards: Card[] = req.result || [];
        for (const card of cards) {
          if (card.deckId === deckId) {
            cardStore.delete(card.id);
          }
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- CARDS ---
  async getCards(): Promise<Card[]> {
    if (!this.isIDBAvailable) {
      return this.getLocal<Card[]>('cards', []);
    }
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_CARDS, 'readonly');
        const store = tx.objectStore(STORE_CARDS);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return this.getLocal<Card[]>('cards', []);
    }
  }

  async saveCard(card: Card): Promise<void> {
    if (!this.isIDBAvailable) {
      const list = this.getLocal<Card[]>('cards', []);
      const idx = list.findIndex((c) => c.id === card.id);
      if (idx >= 0) list[idx] = card;
      else list.push(card);
      this.setLocal('cards', list);
      return;
    }
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CARDS, 'readwrite');
      const store = tx.objectStore(STORE_CARDS);
      store.put(card);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async saveCards(cards: Card[]): Promise<void> {
    if (!this.isIDBAvailable) {
      const list = this.getLocal<Card[]>('cards', []);
      const map = new Map(list.map((c) => [c.id, c]));
      for (const card of cards) {
        map.set(card.id, card);
      }
      this.setLocal('cards', Array.from(map.values()));
      return;
    }
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CARDS, 'readwrite');
      const store = tx.objectStore(STORE_CARDS);
      for (const card of cards) {
        store.put(card);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteCard(cardId: string): Promise<void> {
    if (!this.isIDBAvailable) {
      let list = this.getLocal<Card[]>('cards', []);
      list = list.filter((c) => c.id !== cardId);
      this.setLocal('cards', list);
      return;
    }
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CARDS, 'readwrite');
      tx.objectStore(STORE_CARDS).delete(cardId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- REVIEW LOGS ---
  async getReviewLogs(): Promise<ReviewLog[]> {
    if (!this.isIDBAvailable) {
      return this.getLocal<ReviewLog[]>('logs', []);
    }
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_LOGS, 'readonly');
        const store = tx.objectStore(STORE_LOGS);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return this.getLocal<ReviewLog[]>('logs', []);
    }
  }

  async addReviewLog(log: ReviewLog): Promise<void> {
    if (!this.isIDBAvailable) {
      const list = this.getLocal<ReviewLog[]>('logs', []);
      list.push(log);
      this.setLocal('logs', list);
      return;
    }
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_LOGS, 'readwrite');
      tx.objectStore(STORE_LOGS).put(log);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteReviewLog(logId: string): Promise<void> {
    if (!this.isIDBAvailable) {
      let list = this.getLocal<ReviewLog[]>('logs', []);
      list = list.filter((l) => l.id !== logId);
      this.setLocal('logs', list);
      return;
    }
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_LOGS, 'readwrite');
      tx.objectStore(STORE_LOGS).delete(logId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- BACKUP & RESTORE ---
  async exportAllData(): Promise<{ decks: Deck[]; cards: Card[]; reviewLogs: ReviewLog[] }> {
    const [decks, cards, reviewLogs] = await Promise.all([
      this.getDecks(),
      this.getCards(),
      this.getReviewLogs(),
    ]);
    return { decks, cards, reviewLogs };
  }

  async importAllData(data: {
    decks: Deck[];
    cards: Card[];
    reviewLogs?: ReviewLog[];
  }): Promise<void> {
    if (data.decks && data.decks.length > 0) {
      for (const d of data.decks) {
        await this.saveDeck(d);
      }
    }
    if (data.cards && data.cards.length > 0) {
      await this.saveCards(data.cards);
    }
    if (data.reviewLogs && data.reviewLogs.length > 0) {
      for (const l of data.reviewLogs) {
        await this.addReviewLog(l);
      }
    }
  }

  async resetToDefaults(): Promise<void> {
    if (this.isIDBAvailable) {
      const db = await this.openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([STORE_DECKS, STORE_CARDS, STORE_LOGS], 'readwrite');
        tx.objectStore(STORE_DECKS).clear();
        tx.objectStore(STORE_CARDS).clear();
        tx.objectStore(STORE_LOGS).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
    try {
      localStorage.removeItem('ankipulse_decks');
      localStorage.removeItem('ankipulse_cards');
      localStorage.removeItem('ankipulse_logs');
    } catch {
      // ignore
    }
    for (const d of INITIAL_DECKS) {
      await this.saveDeck(d);
    }
    for (const c of INITIAL_CARDS) {
      await this.saveCard(c);
    }
  }
}

export const db = new Database();
