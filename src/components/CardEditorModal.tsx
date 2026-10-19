import React, { useState } from 'react';
import { X, Volume2, Image, Tag, Sparkles, Eye, Code, HelpCircle } from 'lucide-react';
import { Card, Deck } from '../types/anki';
import { SUPPORTED_LANGUAGES, TTSService } from '../utils/tts';
import { renderClozeBack, renderClozeFront, sanitizeHtml } from '../utils/textFormatter';

interface CardEditorModalProps {
  cardToEdit: Card | null;
  decks: Deck[];
  defaultDeckId?: string;
  onSave: (card: Card) => Promise<void>;
  onClose: () => void;
}

export const CardEditorModal: React.FC<CardEditorModalProps> = ({
  cardToEdit,
  decks,
  defaultDeckId,
  onSave,
  onClose,
}) => {
  const isEditing = !!cardToEdit;

  const [deckId, setDeckId] = useState<string>(
    cardToEdit?.deckId || defaultDeckId || decks[0]?.id || ''
  );
  const [front, setFront] = useState<string>(cardToEdit?.front || '');
  const [back, setBack] = useState<string>(cardToEdit?.back || '');
  const [phonetic, setPhonetic] = useState<string>(cardToEdit?.phonetic || '');
  const [exampleSentence, setExampleSentence] = useState<string>(cardToEdit?.exampleSentence || '');
  const [notes, setNotes] = useState<string>(cardToEdit?.notes || '');
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>(cardToEdit?.tags || []);
  const [audioLang, setAudioLang] = useState<string>(
    cardToEdit?.audioLang || decks.find((d) => d.id === deckId)?.defaultAudioLang || 'es-ES'
  );
  const [audioText, setAudioText] = useState<string>(cardToEdit?.audioText || '');
  const [imageUrl, setImageUrl] = useState<string>(cardToEdit?.imageUrl || '');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Insert cloze snippet {{c1::selected}}
  const insertCloze = () => {
    const textarea = document.getElementById('card-front-input') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = front;
    const selected = text.substring(start, end) || 'word';
    const newText = text.substring(0, start) + `{{c1::${selected}}}` + text.substring(end);
    setFront(newText);
  };

  // Insert Furigana 漢字[かんじ]
  const insertFurigana = () => {
    const textarea = document.getElementById('card-front-input') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = front;
    const selected = text.substring(start, end) || '漢字';
    const newText = text.substring(0, start) + `${selected}[reading]` + text.substring(end);
    setFront(newText);
  };

  // Handle image upload
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;

    setIsSaving(true);
    const now = Date.now();

    const updatedCard: Card = {
      id: cardToEdit ? cardToEdit.id : `card-${now}-${Math.random().toString(36).substr(2, 6)}`,
      deckId,
      front: front.trim(),
      back: back.trim(),
      phonetic: phonetic.trim() || undefined,
      exampleSentence: exampleSentence.trim() || undefined,
      notes: notes.trim() || undefined,
      tags,
      audioText: audioText.trim() || undefined,
      audioLang,
      imageUrl: imageUrl.trim() || undefined,

      // SRS state preservation or creation
      state: cardToEdit?.state || 'new',
      stepIndex: cardToEdit?.stepIndex || 0,
      interval: cardToEdit?.interval || 0,
      easeFactor: cardToEdit?.easeFactor || 2.5,
      repetitions: cardToEdit?.repetitions || 0,
      lapses: cardToEdit?.lapses || 0,
      dueDate: cardToEdit?.dueDate || now,
      lastReviewDate: cardToEdit?.lastReviewDate || null,
      createdAt: cardToEdit?.createdAt || now,
      updatedAt: now,
    };

    await onSave(updatedCard);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-[#161B22] border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0D1117]/80">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white tracking-tight">
              {isEditing ? 'Edit Flashcard' : 'Create New Flashcard'}
            </h2>
            <div className="flex items-center rounded-lg bg-slate-800/80 p-0.5 border border-slate-700/60">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                  activeTab === 'editor' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition flex items-center gap-1 ${
                  activeTab === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Live Preview</span>
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'preview' ? (
            /* Live Card Preview */
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-700 bg-[#0D1117] p-6 text-center shadow-inner">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block mb-2">
                  Front Side (Question)
                </span>
                <div
                  className="text-2xl font-bold text-white"
                  dangerouslySetInnerHTML={{ __html: renderClozeFront(sanitizeHtml(front || 'Front preview...')) }}
                />
                {phonetic && <div className="mt-2 text-sm font-mono text-cyan-400">/{phonetic}/</div>}
                {imageUrl && (
                  <img src={imageUrl} alt="preview" className="mt-3 max-h-36 mx-auto rounded-lg border border-slate-800" />
                )}
              </div>

              <div className="rounded-xl border border-slate-700 bg-[#0D1117] p-6 text-center shadow-inner">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block mb-2">
                  Back Side (Answer)
                </span>
                <div
                  className="text-xl font-bold text-emerald-400 whitespace-pre-line"
                  dangerouslySetInnerHTML={{ __html: renderClozeBack(sanitizeHtml(back || 'Back preview...')) }}
                />
                {exampleSentence && (
                  <p className="mt-3 text-xs text-slate-300 italic bg-slate-900/60 p-2.5 rounded-lg text-left border border-slate-800">
                    "{exampleSentence}"
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Form Fields */
            <form id="card-editor-form" onSubmit={handleSubmit} className="space-y-4">
              {/* Deck selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Target Deck</label>
                <select
                  value={deckId}
                  onChange={(e) => setDeckId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Front (Question / Word) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">Front (Word / Prompt)</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={insertCloze}
                      className="px-2 py-0.5 text-[11px] rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 transition"
                      title="Insert Cloze deletion {{c1::...}}"
                    >
                      + Cloze
                    </button>
                    <button
                      type="button"
                      onClick={insertFurigana}
                      className="px-2 py-0.5 text-[11px] rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 transition"
                      title="Insert Furigana ruby text: 漢字[かんじ]"
                    >
                      + Furigana
                    </button>
                  </div>
                </div>
                <textarea
                  id="card-front-input"
                  required
                  rows={3}
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  placeholder="e.g. ¿Dónde está la estación de tren? or 私[わたし] or {{c1::madrugar}}"
                  className="w-full px-3 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none font-sans"
                />
              </div>

              {/* Back (Answer / Translation / Definition) */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Back (Translation / Answer / Definition)
                </label>
                <textarea
                  required
                  rows={3}
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  placeholder="e.g. Where is the train station?"
                  className="w-full px-3 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Phonetic Pronunciation & Audio Language */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Phonetic / Reading (Optional)
                  </label>
                  <input
                    type="text"
                    value={phonetic}
                    onChange={(e) => setPhonetic(e.target.value)}
                    placeholder="e.g. /es-ta-SYON/ or /Watashi/"
                    className="w-full px-3 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">TTS Audio Voice</label>
                    <button
                      type="button"
                      onClick={() => TTSService.speak(audioText || front, audioLang)}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Test</span>
                    </button>
                  </div>
                  <select
                    value={audioLang}
                    onChange={(e) => setAudioLang(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Example sentence */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Example Context Sentence (Optional)
                </label>
                <input
                  type="text"
                  value={exampleSentence}
                  onChange={(e) => setExampleSentence(e.target.value)}
                  placeholder="e.g. Disculpe señor, ¿dónde está la estación de tren más cercana?"
                  className="w-full px-3 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Image attachment */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Image Attachment (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Paste image URL (https://...) or upload file"
                    className="flex-1 px-3 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <label className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 cursor-pointer flex items-center gap-1 shrink-0">
                    <Image className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Tags</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Type tag and press Enter"
                    className="flex-1 px-3 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700"
                  >
                    Add Tag
                  </button>
                </div>

                {/* Rendered tag list */}
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700"
                      >
                        <span>#{t}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="text-slate-400 hover:text-rose-400"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-800 bg-[#0D1117]/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            form="card-editor-form"
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md active:scale-95 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Card'}
          </button>
        </div>
      </div>
    </div>
  );
};
