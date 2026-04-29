
export interface Language {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
}

export interface TranslationHistory {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

export interface Phrase {
  id: string;
  english: string;
  badini: string;
  category: string;
}

export interface PhraseCategory {
  id: string;
  name: string;
  icon: string;
}

export type TranslationMode = 'normal' | 'smart' | 'pro';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  image?: string;
}

export type AppMode = 'translate' | 'assistant' | 'phrasebook';

export interface LinguisticSettings {
  subDialect: 'duhok' | 'zakho' | 'akre' | 'amadiya';
  showTransliteration: boolean;
  formality: 'neutral' | 'formal' | 'informal';
  useAdvancedOrthography: boolean;
  temperature: number;
  modelType: 'flash' | 'pro' | 'auto';
}
