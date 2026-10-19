import React, { useState } from 'react';
import { X, Download, Upload, FileText, Check, AlertCircle, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { Card, Deck, ReviewLog } from '../types/anki';
import { db } from '../utils/db';

interface ImportExportModalProps {
  decks: Deck[];
  cards: Card[];
  reviewLogs: ReviewLog[];
  onRefreshData: () => Promise<void>;
  onClose: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  decks,
  cards,
  reviewLogs,
  onRefreshData,
  onClose,
}) => {
  const [targetDeckId, setTargetDeckId] = useState<string>(decks[0]?.id || '');
  const [csvText, setCsvText] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Export JSON Backup
  const handleExportJSON = () => {
    try {
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        decks,
        cards,
        reviewLogs,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ankipulse_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage({ text: 'Full JSON backup successfully exported!' });
    } catch {
      setStatusMessage({ text: 'Export failed.', isError: true });
    }
  };

  // Export CSV of cards
  const handleExportCSV = () => {
    try {
      const header = 'Front,Back,Tags,Phonetic,ExampleSentence\n';
      const rows = cards
        .map((c) => {
          const front = `"${c.front.replace(/"/g, '""')}"`;
          const back = `"${c.back.replace(/"/g, '""')}"`;
          const tags = `"${c.tags.join(';')}"`;
          const phonetic = `"${(c.phonetic || '').replace(/"/g, '""')}"`;
          const example = `"${(c.exampleSentence || '').replace(/"/g, '""')}"`;
          return `${front},${back},${tags},${phonetic},${example}`;
        })
        .join('\n');

      const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ankipulse_cards_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage({ text: 'CSV flashcards successfully exported!' });
    } catch {
      setStatusMessage({ text: 'CSV export failed.', isError: true });
    }
  };

  // Import JSON File
  const handleJSONFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const json = JSON.parse(reader.result as string);
        if (json.decks || json.cards) {
          await db.importAllData(json);
          await onRefreshData();
          setStatusMessage({ text: 'Data backup restored successfully!' });
        } else {
          setStatusMessage({ text: 'Invalid backup file format.', isError: true });
        }
      } catch {
        setStatusMessage({ text: 'Failed to parse JSON file.', isError: true });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  // Import CSV text
  const handleImportCSV = async () => {
    if (!csvText.trim()) return;

    setIsProcessing(true);
    try {
      const lines = csvText.trim().split('\n');
      const now = Date.now();
      const newCards: Card[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Skip CSV header if detected
        if (i === 0 && (line.toLowerCase().includes('front') || line.toLowerCase().includes('question'))) {
          continue;
        }

        // Parse CSV/TSV separated by comma or tab or semicolon
        const separator = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
        const parts = line.split(separator).map((p) => p.trim().replace(/^["']|["']$/g, ''));

        if (parts.length >= 2) {
          const front = parts[0];
          const back = parts[1];
          const rawTags = parts[2] ? parts[2].split(/[,; ]+/).filter(Boolean) : [];
          const phonetic = parts[3] || undefined;
          const example = parts[4] || undefined;

          newCards.push({
            id: `card-${now}-${i}-${Math.random().toString(36).substr(2, 5)}`,
            deckId: targetDeckId,
            front,
            back,
            tags: rawTags,
            phonetic,
            exampleSentence: example,
            state: 'new',
            stepIndex: 0,
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            lapses: 0,
            dueDate: now,
            lastReviewDate: null,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      if (newCards.length > 0) {
        await db.saveCards(newCards);
        await onRefreshData();
        setCsvText('');
        setStatusMessage({ text: `Successfully imported ${newCards.length} flashcards!` });
      } else {
        setStatusMessage({ text: 'No valid card rows found in input.', isError: true });
      }
    } catch {
      setStatusMessage({ text: 'CSV parsing error.', isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset to default sample decks
  const handleResetDefaults = async () => {
    if (confirm('Restore sample foreign vocabulary decks (Spanish, Japanese, French)? Existing changes will be reset.')) {
      setIsProcessing(true);
      await db.resetToDefaults();
      await onRefreshData();
      setIsProcessing(false);
      setStatusMessage({ text: 'Sample vocabulary decks restored successfully.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-[#161B22] border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0D1117]/80">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Import & Export Data</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {statusMessage && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2 text-xs font-medium ${
                statusMessage.isError
                  ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              }`}
            >
              {statusMessage.isError ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <Check className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Section 1: CSV Quick Import */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Import Flashcards (CSV / Text / Anki Format)</span>
            </h3>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Import into Deck</label>
              <select
                value={targetDeckId}
                onChange={(e) => setTargetDeckId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
              >
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Paste CSV or Tab-separated rows (Front, Back, Tags)
              </label>
              <textarea
                rows={4}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Front, Back, Tags&#10;hola, hello, greeting;spanish&#10;gracias, thank you, courtesy&#10;por favor, please, courtesy"
                className="w-full px-3 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              onClick={handleImportCSV}
              disabled={isProcessing || !csvText.trim()}
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition active:scale-95"
            >
              {isProcessing ? 'Importing...' : 'Parse & Add Flashcards'}
            </button>
          </div>

          {/* Section 2: Full Backup Export / Import */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-indigo-400" />
              <span>Backup & Data Export</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={handleExportJSON}
                className="p-3 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-700/60 text-left transition flex items-center gap-2 text-xs font-medium text-slate-200"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="font-semibold text-white">Export Full JSON</div>
                  <div className="text-[10px] text-slate-400">Includes all decks, cards & logs</div>
                </div>
              </button>

              <button
                onClick={handleExportCSV}
                className="p-3 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-700/60 text-left transition flex items-center gap-2 text-xs font-medium text-slate-200"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-semibold text-white">Export CSV Cards</div>
                  <div className="text-[10px] text-slate-400">Spreadsheet & Anki readable</div>
                </div>
              </button>
            </div>

            {/* Restore JSON */}
            <div className="pt-2">
              <label className="block text-xs text-slate-400 mb-1.5">
                Restore Collection from JSON File
              </label>
              <label className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500 bg-[#0D1117] text-slate-400 hover:text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition">
                <Upload className="w-4 h-4" />
                <span>Upload .json backup file</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleJSONFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Section 3: Reset */}
          <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
            <button
              onClick={handleResetDefaults}
              className="text-xs text-slate-500 hover:text-rose-400 flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset to Sample Decks (Spanish, Japanese, French)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
