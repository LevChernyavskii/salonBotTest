/**
 * Helper to parse cloze deletions {{c1::answer}} and Japanese furigana 漢字[かんじ]
 */

export function renderClozeFront(text: string): string {
  if (!text) return '';
  // Replace {{c1::answer}} with [...]
  let processed = text.replace(/\{\{c\d+::(.*?)\}\}/g, '<span class="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-sm border border-indigo-500/40">[...]</span>');
  // Process ruby/furigana
  processed = renderFurigana(processed);
  return processed;
}

export function renderClozeBack(text: string): string {
  if (!text) return '';
  // Replace {{c1::answer}} with highlighted answer
  let processed = text.replace(
    /\{\{c\d+::(.*?)\}\}/g,
    '<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40">$1</span>'
  );
  // Process ruby/furigana
  processed = renderFurigana(processed);
  return processed;
}

export function renderFurigana(text: string): string {
  if (!text) return '';
  // Match Kanji/chars followed immediately by [kana/reading] e.g. 漢字[かんじ] or 食べる[たべる]
  // Pattern: ([\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff\w]+)\[([^\s\]]+)\]
  return text.replace(
    /([\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ffA-Za-z]+)\[([^\s\]]+)\]/g,
    '<ruby class="ruby-text">$1<rt class="text-[0.6em] text-cyan-400 font-normal tracking-tight">$2</rt></ruby>'
  );
}

export function sanitizeHtml(html: string): string {
  // Simple basic safe tags transformer for bold/italic/break
  return html
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />');
}
