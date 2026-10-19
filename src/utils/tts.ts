export interface LanguageOption {
  code: string;
  label: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'es-ES', label: 'Spanish (Español)', flag: '🇪🇸' },
  { code: 'ja-JP', label: 'Japanese (日本語)', flag: '🇯🇵' },
  { code: 'fr-FR', label: 'French (Français)', flag: '🇫🇷' },
  { code: 'de-DE', label: 'German (Deutsch)', flag: '🇩🇪' },
  { code: 'it-IT', label: 'Italian (Italiano)', flag: '🇮🇹' },
  { code: 'zh-CN', label: 'Chinese (Mandarin)', flag: '🇨🇳' },
  { code: 'ko-KR', label: 'Korean (한국어)', flag: '🇰🇷' },
  { code: 'ru-RU', label: 'Russian (Русский)', flag: '🇷🇺' },
  { code: 'pt-BR', label: 'Portuguese (Português)', flag: '🇧🇷' },
  { code: 'en-US', label: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', label: 'English (UK)', flag: '🇬🇧' },
];

/**
 * Text-to-speech speaker using browser Web Speech API (works completely offline)
 */
export class TTSService {
  private static synth: SpeechSynthesis | null =
    typeof window !== 'undefined' && 'speechSynthesis' in window
      ? window.speechSynthesis
      : null;

  static isSupported(): boolean {
    return !!this.synth;
  }

  static stop(): void {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {
        // ignore
      }
    }
  }

  static speak(
    text: string,
    lang: string = 'en-US',
    rate: number = 0.95,
    pitch: number = 1.0
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.synth || !text) {
        resolve(false);
        return;
      }

      try {
        this.synth.cancel(); // Stop any pending utterance

        // Strip cloze tags or html from speech text
        const cleanText = text
          .replace(/\{\{c\d+::(.*?)\}\}/g, '$1')
          .replace(/<ruby>(.*?)<rt>.*?<\/rt><\/ruby>/g, '$1')
          .replace(/\[.*?\]/g, '')
          .replace(/<[^>]*>/g, '')
          .trim();

        if (!cleanText) {
          resolve(false);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.pitch = pitch;

        // Try to pick an authentic voice matching the language
        const voices = this.synth.getVoices();
        const bestVoice = voices.find(
          (v) => v.lang.toLowerCase() === lang.toLowerCase() || v.lang.startsWith(lang.slice(0, 2))
        );
        if (bestVoice) {
          utterance.voice = bestVoice;
        }

        utterance.onend = () => resolve(true);
        utterance.onerror = () => resolve(false);

        this.synth.speak(utterance);
      } catch {
        resolve(false);
      }
    });
  }
}
