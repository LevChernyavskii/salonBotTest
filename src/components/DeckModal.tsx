import React, { useState } from 'react';
import { X, Palette, Volume2, Sliders, Info } from 'lucide-react';
import { Deck, DeckSettings } from '../types/anki';
import { DEFAULT_DECK_SETTINGS } from '../utils/sm2';
import { SUPPORTED_LANGUAGES } from '../utils/tts';

interface DeckModalProps {
  deckToEdit: Deck | null;
  onSave: (deck: Deck) => Promise<void>;
  onClose: () => void;
}

const DECK_COLORS = [
  '#6366F1', // Indigo
  '#38BDF8', // Sky / Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#14B8A6', // Teal
];

export const DeckModal: React.FC<DeckModalProps> = ({ deckToEdit, onSave, onClose }) => {
  const isEditing = !!deckToEdit;

  const [name, setName] = useState(deckToEdit?.name || '');
  const [description, setDescription] = useState(deckToEdit?.description || '');
  const [color, setColor] = useState(deckToEdit?.color || DECK_COLORS[0]);
  const [defaultAudioLang, setDefaultAudioLang] = useState(
    deckToEdit?.defaultAudioLang || 'es-ES'
  );

  // Deck SRS settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [settings, setSettings] = useState<DeckSettings>(
    deckToEdit?.settings || { ...DEFAULT_DECK_SETTINGS }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const now = Date.now();
    const updatedDeck: Deck = {
      id: deckToEdit ? deckToEdit.id : `deck-${now}-${Math.random().toString(36).substr(2, 5)}`,
      name: name.trim(),
      description: description.trim(),
      color,
      defaultAudioLang,
      settings,
      createdAt: deckToEdit?.createdAt || now,
      updatedAt: now,
    };

    await onSave(updatedDeck);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-[#161B22] border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0D1117]/80">
          <h2 className="text-lg font-bold text-white tracking-tight">
            {isEditing ? 'Deck Options & Settings' : 'Create New Deck'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Deck Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Deck Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Japanese::JLPT N4 or Spanish::Travel"
              className="w-full px-3 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Tip: Use <code className="text-indigo-400">::</code> to create sub-decks (e.g. <span className="font-mono">Languages::French</span>)
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Target vocabulary, goals, notes..."
              className="w-full px-3 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Color & Audio Voice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Color */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Accent Color</label>
              <div className="flex items-center gap-2">
                {DECK_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#161B22]' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Default Audio Lang */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Default Pronunciation Voice
              </label>
              <select
                value={defaultAudioLang}
                onChange={(e) => setDefaultAudioLang(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Advanced SM-2 Options Toggle */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showAdvanced ? 'Hide SM-2 Parameters' : 'Configure SM-2 Parameters'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 p-3.5 rounded-xl bg-[#0D1117] border border-slate-800 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">New Cards / Day</label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={settings.newCardsPerDay}
                      onChange={(e) =>
                        setSettings({ ...settings, newCardsPerDay: Number(e.target.value) || 20 })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Max Reviews / Day</label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={settings.maxReviewsPerDay}
                      onChange={(e) =>
                        setSettings({ ...settings, maxReviewsPerDay: Number(e.target.value) || 100 })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Starting Ease Factor</label>
                    <input
                      type="number"
                      step="0.05"
                      min={1.3}
                      max={3.0}
                      value={settings.startingEase}
                      onChange={(e) =>
                        setSettings({ ...settings, startingEase: Number(e.target.value) || 2.5 })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Easy Interval (Days)</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={settings.easyInterval}
                      onChange={(e) =>
                        setSettings({ ...settings, easyInterval: Number(e.target.value) || 4 })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md active:scale-95"
            >
              {isEditing ? 'Save Deck' : 'Create Deck'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
