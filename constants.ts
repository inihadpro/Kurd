
import { Language, Phrase, PhraseCategory } from './types';

export const LANGUAGES: Language[] = [
  { code: 'badini', name: 'Badini Kurdish', nativeName: 'کوردیا بادینی', rtl: true },
  { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', rtl: false },
  { code: 'ku-ckb', name: 'Sorani Kurdish', nativeName: 'کوردیی سۆرانی', rtl: true },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', rtl: true }
];

export const SYSTEM_INSTRUCTION = `
You are the world's leading expert on Kurdish Badini (Arabic Script) as spoken in the Behdinan region (Duhok, Zakho, Amadiya, Akre).
Your translations must be:
1. Accurate: Respect the specific phonology and vocabulary of Badini.
2. Dialectal: Use "ڤ" (V), "ڕ" (R - trill), "ڵ" (L - dark), and the proper vowels "ۆ" (O), "ێ" (E).
3. Contextual: Use regional phrasing like "هەر بژی" for "Bravo" and "سەرچاڤا" for "You're welcome".
4. Script-Perfect: Follow the standard Kurdish-Arabic orthography (Central Kurdish rules adapted for Badini phonemes).

When translating to Badini:
- Prefer "دڤێت" over "دەوێت".
- Prefer "دکەت" over "دەکات".
- Ensure you handle the ezafe (-ê, -ا) correctly for nouns.
Respond only with the translation or the most natural equivalent.
`;

export const PHRASE_CATEGORIES: PhraseCategory[] = [
  { id: 'all', name: 'Main', icon: '✨' },
  { id: 'social', name: 'Social', icon: '🤝' },
  { id: 'duhok', name: 'Duhok Style', icon: '🏰' },
  { id: 'travel', name: 'Travel', icon: '🚕' },
  { id: 'emergency', name: 'Help', icon: '🆘' }
];

export const PHRASES: Phrase[] = [
  // Social - Greetings & Basic
  { id: 's1', category: 'social', english: 'Welcome', badini: 'بخێر بێی' },
  { id: 's2', category: 'social', english: 'How is it going?', badini: 'دەنگ و باس؟' },
  { id: 's3', category: 'social', english: 'Good evening', badini: 'ئێڤار باش' },
  { id: 's4', category: 'social', english: 'May you live long (Greeting)', badini: 'هەر بژی' },
  { id: 's5', category: 'social', english: 'I missed you', badini: 'من بیری ل تە کریە' },
  { id: 's6', category: 'social', english: 'Good morning', badini: 'سپێدە باش' },
  { id: 's7', category: 'social', english: 'Good night', badini: 'شەڤ باش' },
  { id: 's8', category: 'social', english: 'How are you?', badini: 'تۆ چەوایی؟' },
  { id: 's9', category: 'social', english: 'I am fine, thank God', badini: 'ئەز باشم، شوکر بۆ خودێ' },
  { id: 's10', category: 'social', english: 'What is your name?', badini: 'ناڤێ تە چیە؟' },
  { id: 's11', category: 'social', english: 'Nice to meet you', badini: 'خۆشحاڵ بووم ب ناسینا تە' },
  { id: 's12', category: 'social', english: 'Thank you very much', badini: 'گەلەک سپاس بۆ تە' },
  { id: 's13', category: 'social', english: 'You are welcome', badini: 'سەرچاڤا' },
  { id: 's14', category: 'social', english: 'Please', badini: 'بێ زەحمەت' },
  { id: 's15', category: 'social', english: 'Sorry / Excuse me', badini: 'ببورە' },
  { id: 's16', category: 'social', english: 'Goodbye', badini: 'ب خاترێ تە' },
  { id: 's17', category: 'social', english: 'God bless you', badini: 'خودێ تە پارێزیت' },
  { id: 's18', category: 'social', english: 'No problem', badini: 'چ ئاریشە نینن' },

  // Duhok Specifics & Slang
  { id: 'du1', category: 'duhok', english: 'I want to go to the bazaar', badini: 'من دڤێت بچمە بازاڕی' },
  { id: 'du2', category: 'duhok', english: 'Is this food from Duhok?', badini: 'ئەڤ خوارنە یا دهۆکێ یە؟' },
  { id: 'du3', category: 'duhok', english: 'The weather is beautiful', badini: 'کەشو هەوا یێ جوانە' },
  { id: 'du4', category: 'duhok', english: 'Where are you from?', badini: 'تۆ ژ کیڤەیی؟' },
  { id: 'du5', category: 'duhok', english: 'I am from Duhok', badini: 'ئەز یێ ژ دهۆکێ مە' },
  { id: 'du6', category: 'duhok', english: 'Everything is fine', badini: 'هەمی تشت یێ باشن' },
  { id: 'du7', category: 'duhok', english: 'I love Badini dialect', badini: 'من حەز ل شێوەزارێ بادینی یە' },
  { id: 'du8', category: 'duhok', english: 'Really? / Is that so?', badini: 'ما وەیە؟' },
  { id: 'du9', category: 'duhok', english: 'Wait a moment', badini: 'چاڤەڕێ بە بۆ دەمەکێ کێم' },

  // Travel & Shopping
  { id: 't1', category: 'travel', english: 'Where can I find a taxi?', badini: 'تاکسی ل کیڤە دێ بینم؟' },
  { id: 't2', category: 'travel', english: 'Drive slowly, please', badini: 'بێ زەحمەت هێدی بهاژۆ' },
  { id: 't3', category: 'travel', english: 'Turn right at the signal', badini: 'ل ترافیكێ لایێ ڕاستێ هەرە' },
  { id: 't4', category: 'travel', english: 'How much is this?', badini: 'ئەڤە ب چەندێ یە؟' },
  { id: 't5', category: 'travel', english: 'It is very expensive', badini: 'ئەڤە گەلەک یا گرانە' },
  { id: 't6', category: 'travel', english: 'Give me a discount', badini: 'بێ زەحمەت کێم بکە' },
  { id: 't7', category: 'travel', english: 'Where is the hotel?', badini: 'ئوتێل ل کیڤەیە؟' },
  { id: 't8', category: 'travel', english: 'I am lost', badini: 'ئەز یێ بەرزە بوویم' },
  { id: 't9', category: 'travel', english: 'Where is the toilet?', badini: 'ئاڤدەست ل کیڤەیە؟' },
  { id: 't10', category: 'travel', english: 'I am hungry', badini: 'ئەز یێ برسی مە' },
  { id: 't11', category: 'travel', english: 'I am thirsty', badini: 'ئەز یێ تێنی مە' },
  { id: 't12', category: 'travel', english: 'The bill, please', badini: 'پسوولێ بێ زەحمەت' },

  // Emergency & Health
  { id: 'e1', category: 'emergency', english: 'I feel sick', badini: 'ئەز یێ نەساخم' },
  { id: 'e2', category: 'emergency', english: 'Where is the pharmacy?', badini: 'دەرمانخانە ل کیڤەیە؟' },
  { id: 'e3', category: 'emergency', english: 'Help me!', badini: 'هاریکاریا من بکەن!' },
  { id: 'e4', category: 'emergency', english: 'Call an ambulance', badini: 'تەلەفۆنێ بۆ ئیسعافێ بکە' },
  { id: 'e5', category: 'emergency', english: 'I have a headache', badini: 'سەرێ من یێ تێشێت' },
  { id: 'e6', category: 'emergency', english: 'I need a doctor', badini: 'من پێدڤی ب دکتۆری هەیه' },
  { id: 'e7', category: 'emergency', english: 'Where is the hospital?', badini: 'نەساخخانە ل کیڤەیە؟' },
  { id: 'e8', category: 'emergency', english: 'It hurts here', badini: 'ل ڤێرە یێ تێشێت' }
];
