
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { translateText, getAssistantResponse, generateSpeech } from './services/geminiService';
import { LANGUAGES } from './constants';
import { TranslationHistory, Phrase, TranslationMode, ChatMessage, AppMode, LinguisticSettings } from './types';
import LanguageSelector from './components/LanguageSelector';
import Phrasebook from './components/Phrasebook';

const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
if (pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const DEFAULT_SETTINGS: LinguisticSettings = {
  subDialect: 'duhok',
  showTransliteration: false,
  formality: 'neutral',
  useAdvancedOrthography: true,
  temperature: 0.3,
  modelType: 'auto'
};

const App: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>('translate');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('badini');
  const [translationMode, setTranslationMode] = useState<TranslationMode>('smart');
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isHistoryExportMenuOpen, setIsHistoryExportMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [history, setHistory] = useState<TranslationHistory[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [userPhrases, setUserPhrases] = useState<Phrase[]>([]);
  const [settings, setSettings] = useState<LinguisticSettings>(DEFAULT_SETTINGS);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'سلاڤ! ئەز شارەزایێ زمانێ کوردی ب شێوەزارێ بادینیمە. ئەز چەوا دشێم هاریکاریا تە بکەم؟',
      timestamp: Date.now()
    }
  ]);
  const [currentChatInput, setCurrentChatInput] = useState('');
  const [assistantImage, setAssistantImage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const historyExportMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('badini_theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initialTheme);
    
    const savedHistory = localStorage.getItem('badini_translate_history');
    if (savedHistory) try { setHistory(JSON.parse(savedHistory)); } catch (e) {}
    const savedFavs = localStorage.getItem('badini_favorites');
    if (savedFavs) try { setFavorites(JSON.parse(savedFavs)); } catch (e) {}
    const savedUserPhrases = localStorage.getItem('badini_user_phrases');
    if (savedUserPhrases) try { setUserPhrases(JSON.parse(savedUserPhrases)); } catch (e) {}
    const savedSettings = localStorage.getItem('badini_settings');
    if (savedSettings) try { setSettings(JSON.parse(savedSettings)); } catch (e) {}
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('badini_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('badini_translate_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('badini_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('badini_user_phrases', JSON.stringify(userPhrases));
  }, [userPhrases]);

  useEffect(() => {
    localStorage.setItem('badini_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(event.target as Node)) {
        setIsModeMenuOpen(false);
      }
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(event.target as Node)) {
        setIsUploadMenuOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
      if (historyExportMenuRef.current && !historyExportMenuRef.current.contains(event.target as Node)) {
        setIsHistoryExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const removeUserPhrase = (id: string) => {
    setUserPhrases(prev => prev.filter(p => p.id !== id));
  };

  const updateUserPhrase = (updatedPhrase: Phrase) => {
    setUserPhrases(prev => prev.map(p => p.id === updatedPhrase.id ? updatedPhrase : p));
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const isCurrentTranslationSaved = () => {
    if (!sourceText.trim() || !translatedText.trim()) return false;
    return userPhrases.some(p => p.english === sourceText && p.badini === translatedText);
  };

  const saveCurrentTranslation = () => {
    if (!sourceText.trim() || !translatedText.trim()) return;
    
    const exists = isCurrentTranslationSaved();
    if (exists) {
      showToast("Already saved in phrasebook.", "success");
      return;
    }

    const newPhrase: Phrase = {
      id: `user-${Date.now()}`,
      english: sourceText,
      badini: translatedText,
      category: 'personal'
    };
    
    setUserPhrases(prev => [newPhrase, ...prev]);
    setFavorites(prev => [...prev, newPhrase.id]);
    showToast("Saved to personal phrasebook!", "success");
  };

  const handleExportHistory = (format: 'txt' | 'csv') => {
    if (history.length === 0) {
      showToast("No history to export.");
      return;
    }

    let content = '';
    let filename = `badini_history_${new Date().toISOString().split('T')[0]}`;
    let mimeType = 'text/plain';

    if (format === 'txt') {
      content = `iNihadPro - TRANSLATION HISTORY\nExported on: ${new Date().toLocaleString()}\n\n`;
      history.forEach((item, index) => {
        content += `${index + 1}. [${new Date(item.timestamp).toLocaleString()}]\n`;
        content += `   FROM (${item.sourceLang}): ${item.sourceText}\n`;
        content += `   TO (${item.targetLang}): ${item.translatedText}\n`;
        content += `--------------------------------------------------\n`;
      });
      filename += '.txt';
    } else if (format === 'csv') {
      mimeType = 'text/csv';
      content = "Timestamp,Source Lang,Target Lang,Source Text,Translated Text\n";
      history.forEach(item => {
        const timestamp = new Date(item.timestamp).toISOString();
        const escapedSource = `"${item.sourceText.replace(/"/g, '""')}"`;
        const escapedTranslated = `"${item.translatedText.replace(/"/g, '""')}"`;
        content += `${timestamp},${item.sourceLang},${item.targetLang},${escapedSource},${escapedTranslated}\n`;
      });
      filename += '.csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsHistoryExportMenuOpen(false);
    showToast(`History exported as ${format.toUpperCase()}`, "success");
  };

  const handleExport = (format: 'txt' | 'srt' | 'pdf') => {
    if (!translatedText) return;
    
    let content = '';
    let filename = `translation_${Date.now()}`;
    let mimeType = 'text/plain';

    if (format === 'txt') {
      content = `Source (${sourceLang}):\n${sourceText}\n\nTranslation (${targetLang}):\n${translatedText}`;
      filename += '.txt';
    } else if (format === 'srt') {
      content = `1\n00:00:01,000 --> 00:00:10,000\n${translatedText}`;
      filename += '.srt';
    } else if (format === 'pdf') {
      content = `iNihadPro TRANSLATION REPORT\n============================\n\nORIGINAL (${sourceLang}):\n${sourceText}\n\nBADINI TRANSLATION:\n${translatedText}\n\nGenerated on: ${new Date().toLocaleString()}`;
      filename += '.txt';
      showToast("Exported as formatted report.");
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
  };

  const playTextToSpeech = async (text: string, lang: string) => {
    if (!text || isPlaying) return;
    setIsPlaying(true);
    try {
      const base64Audio = await generateSpeech(text, lang);
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      const binary = atob(base64Audio);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
    } catch (err) {
      showToast("Audio failed.");
      setIsPlaying(false);
    }
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech not supported.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    const langMap: Record<string, string> = { 'badini': 'ku-Arab-IQ', 'en': 'en-US', 'ar': 'ar-SA', 'tr': 'tr-TR', 'ku-ckb': 'ckb-IQ', 'fa': 'fa-IR' };
    recognition.lang = langMap[sourceLang] || 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) {
         if (appMode === 'assistant') {
             setCurrentChatInput(prev => (prev.trim() ? prev + ' ' + finalTranscript : finalTranscript));
         } else {
             setSourceText(prev => (prev.trim() ? prev + ' ' + finalTranscript : finalTranscript));
         }
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    try { recognition.start(); } catch (err) { setIsListening(false); }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsCameraActive(true);
      setIsUploadMenuOpen(false);
    } catch (err) { showToast("Camera error."); }
  };

  const stopCamera = () => { streamRef.current?.getTracks().forEach(t => t.stop()); setIsCameraActive(false); };

  const handleCapture = async () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        
        if (appMode === 'translate') {
          setIsLoading(true);
          try {
            const result = await translateText("", sourceLang, targetLang, translationMode, { data: base64, mimeType: 'image/jpeg' }, settings);
            setTranslatedText(result); setSourceText("[Photo Captured]"); stopCamera();
          } catch (err) { showToast("Translation failed."); }
          finally { setIsLoading(false); }
        } else if (appMode === 'assistant') {
          setAssistantImage(base64);
          stopCamera();
        }
      }
    }
  };

  const extractTextFromPDF = async (data: ArrayBuffer): Promise<string> => {
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n\n';
    }
    return fullText.trim();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    
    // For assistant mode, handle image selection without immediate translation
    if (appMode === 'assistant') {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = (event.target?.result as string).split(',')[1];
          setAssistantImage(base64);
        };
        reader.readAsDataURL(file);
      } else {
        showToast("Only images are supported in Expert mode.");
      }
      e.target.value = ''; // Reset input
      return;
    }

    setIsLoading(true); setIsUploadMenuOpen(false); setToast(null);
    try {
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          try {
            setSourceText("[Extracting...]");
            const text = await extractTextFromPDF(arrayBuffer);
            setSourceText(text || "");
          } catch (err) { showToast("PDF error."); } finally { setIsLoading(false); }
        };
        reader.readAsArrayBuffer(file);
      } else if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = (event.target?.result as string).split(',')[1];
          try {
            const result = await translateText("", sourceLang, targetLang, translationMode, { data: base64, mimeType: file.type }, settings);
            setTranslatedText(result); setSourceText("[Image Uploaded]");
          } catch (err) { showToast("Image error."); } finally { setIsLoading(false); }
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader(); reader.onload = (event) => { setSourceText(event.target?.result as string); setIsLoading(false); };
        reader.readAsText(file);
      }
    } catch (err) { showToast("Upload failed."); setIsLoading(false); }
    e.target.value = ''; // Reset input
  };

  const handleTranslate = useCallback(async (text: string, sLang: string, tLang: string, mode: TranslationMode) => {
    if (!text.trim() || text.startsWith("[")) { if (!text.trim()) setTranslatedText(''); return; }
    setIsLoading(true); setToast(null);
    try {
      const result = await translateText(text, sLang, tLang, mode, undefined, settings);
      setTranslatedText(result);
      setHistory(prev => [{ id: Date.now().toString(), sourceText: text, translatedText: result, sourceLang: sLang, targetLang: tLang, timestamp: Date.now() }, ...prev].slice(0, 15));
    } catch (err) { showToast('Service error.'); }
    finally { setIsLoading(false); }
  }, [settings]);

  useEffect(() => {
    if (appMode !== 'translate' || isCameraActive) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (sourceText.trim() && !sourceText.startsWith("[")) {
      timerRef.current = setTimeout(() => handleTranslate(sourceText, sourceLang, targetLang, translationMode), 1200);
    } else if (!sourceText.trim()) setTranslatedText('');
    return () => clearTimeout(timerRef.current!);
  }, [sourceText, sourceLang, targetLang, translationMode, handleTranslate, appMode, isCameraActive]);

  const handleSendMessage = async () => {
    if ((!currentChatInput.trim() && !assistantImage) || isStreaming) return;
    const userMsg: ChatMessage = { 
      id: Date.now().toString(), 
      role: 'user', 
      text: currentChatInput || (assistantImage ? "Image sent" : ""), 
      timestamp: Date.now(),
      image: assistantImage || undefined
    };
    
    setChatMessages(prev => [...prev, userMsg]); 
    const capturedImage = assistantImage;
    setAssistantImage(null);
    setCurrentChatInput(''); 
    setIsStreaming(true);
    
    const modelMsgId = (Date.now() + 1).toString();
    setChatMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: '', timestamp: Date.now() }]);
    
    try {
      await getAssistantResponse(
        userMsg.text, 
        [...chatMessages, userMsg], 
        (chunk) => {
          setChatMessages(prev => prev.map(m => m.id === modelMsgId ? { ...m, text: m.text + chunk } : m));
        },
        capturedImage ? { data: capturedImage, mimeType: 'image/jpeg' } : undefined
      );
    } catch (e) { showToast('Assistant failed.'); }
    finally { setIsStreaming(false); }
  };

  const currentSourceLang = LANGUAGES.find(l => l.code === sourceLang);
  const currentTargetLang = LANGUAGES.find(l => l.code === targetLang);

  const SpeechIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  );

  const isSaved = isCurrentTranslationSaved();

  return (
    <div className={`flex flex-col h-screen overflow-hidden font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <header className={`flex items-center justify-between px-6 py-4 backdrop-blur-md border-b z-30 shrink-0 ${theme === 'dark' ? 'bg-slate-900/50 border-white/5' : 'bg-white/70 border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center font-bold shadow-lg shadow-brand-900/20 text-white">i</div>
          <h1 className={`text-xl font-extrabold tracking-tight bg-gradient-to-r bg-clip-text text-transparent ${theme === 'dark' ? 'from-white to-slate-400' : 'from-slate-900 to-slate-500'}`}>iNihadPro</h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme}
            className={`p-2 transition-all rounded-xl ${theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className={`p-2 transition-all rounded-xl ${theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
            title="Linguistic Settings"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-24 relative">
        {/* Full screen Camera Overlay for Assistant */}
        {appMode === 'assistant' && isCameraActive && (
          <div className="absolute inset-0 z-50 bg-black flex flex-col">
             <div className="flex-1 relative overflow-hidden">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-8">
                  <div className="flex justify-center gap-8 items-center">
                     <button onClick={stopCamera} className="p-4 bg-white/10 backdrop-blur-xl rounded-full text-white border border-white/10">✕</button>
                     <button onClick={handleCapture} className="p-6 bg-white rounded-full text-slate-950 shadow-2xl active:scale-90 transition-transform w-20 h-20 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full border-2 border-slate-900"></div>
                     </button>
                  </div>
                </div>
             </div>
          </div>
        )}

        {appMode === 'translate' && (
          <div className="max-w-4xl mx-auto p-4 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1" ref={modeMenuRef}>
                <button onClick={() => setIsModeMenuOpen(!isModeMenuOpen)} className={`w-full flex items-center justify-between border font-bold py-3 px-5 rounded-2xl shadow-xl transition-all ${theme === 'dark' ? 'bg-slate-900 border-white/10 text-white hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-2">
                    <span className="uppercase text-xs tracking-widest">{translationMode}</span>
                  </div>
                  <svg className={`w-4 h-4 transition-transform ${isModeMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {isModeMenuOpen && (
                  <div className={`absolute top-full left-0 right-0 mt-2 border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                    {['normal', 'smart', 'pro'].map((m) => (
                      <button key={m} onClick={() => {setTranslationMode(m as TranslationMode); setIsModeMenuOpen(false);}} className={`w-full text-left px-5 py-4 hover:bg-white/5 transition-colors flex items-center justify-between ${translationMode === m ? (theme === 'dark' ? 'bg-white/5' : 'bg-slate-50') : ''}`}>
                        <span className={`capitalize font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{m}</span>
                        {translationMode === m && <div className="w-2 h-2 rounded-full bg-brand-500"></div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative" ref={uploadMenuRef}>
                <button onClick={() => setIsUploadMenuOpen(!isUploadMenuOpen)} className={`p-4 border rounded-2xl transition-all shadow-xl ${theme === 'dark' ? 'bg-slate-900 border-white/10 text-slate-400 hover:text-white hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                </button>
                {isUploadMenuOpen && (
                  <div className={`absolute top-full right-0 mt-2 w-48 border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 ${theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                    <button onClick={startCamera} className={`w-full flex items-center gap-3 px-5 py-4 hover:bg-white/5 text-sm font-bold border-b ${theme === 'dark' ? 'border-white/5 text-white' : 'border-slate-100 text-slate-800'}`}>Camera</button>
                    <button onClick={() => imageInputRef.current?.click()} className={`w-full flex items-center gap-3 px-5 py-4 hover:bg-white/5 text-sm font-bold border-b ${theme === 'dark' ? 'border-white/5 text-white' : 'border-slate-100 text-slate-800'}`}>Gallery</button>
                    <button onClick={() => fileInputRef.current?.click()} className={`w-full flex items-center gap-3 px-5 py-4 hover:bg-white/5 text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Document</button>
                  </div>
                )}
              </div>
            </div>

            <div className={`border rounded-[2.5rem] shadow-2xl overflow-hidden group transition-colors ${theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="relative p-8">
                {isCameraActive ? (
                  <div className="aspect-video bg-black rounded-3xl overflow-hidden relative border border-white/5">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                      <div className="flex justify-center gap-6">
                         <button onClick={stopCamera} className="p-4 bg-white/10 backdrop-blur-xl rounded-full text-white border border-white/10">✕</button>
                         <button onClick={handleCapture} className="p-6 bg-white rounded-full text-slate-950 shadow-2xl active:scale-90 transition-transform">●</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="Type here to translate..." dir={currentSourceLang?.rtl ? 'rtl' : 'ltr'} className={`w-full bg-transparent border-none text-2xl font-medium focus:ring-0 placeholder-slate-400 dark:placeholder-slate-700 resize-none min-h-[140px] ${theme === 'dark' ? 'text-white' : 'text-slate-900'} ${currentSourceLang?.rtl ? 'arabic-font leading-relaxed' : ''}`} />
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex gap-4">
                         <button onClick={toggleListening} className={`p-3 rounded-2xl transition-all shadow-lg ${isListening ? 'bg-red-500 text-white animate-pulse' : (theme === 'dark' ? 'bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200')}`}>Mic</button>
                         <button onClick={() => playTextToSpeech(sourceText, sourceLang)} className={`p-3 rounded-2xl transition-all ${theme === 'dark' ? 'bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}><SpeechIcon /></button>
                      </div>
                      {sourceText && <button onClick={() => setSourceText('')} className="text-xs font-bold text-slate-500 hover:text-slate-400 uppercase tracking-widest">Clear</button>}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
               <div className="flex-1 max-w-[42%]"><LanguageSelector label="From" value={sourceLang} onChange={setSourceLang} isDark={theme === 'dark'} /></div>
               <button onClick={() => {setSourceLang(targetLang); setTargetLang(sourceLang); setSourceText(translatedText);}} className="p-4 bg-brand-600 rounded-full text-white shadow-xl shadow-brand-900/30 active:rotate-180 transition-all duration-500">⇄</button>
               <div className="flex-1 max-w-[42%]"><LanguageSelector label="To" value={targetLang} onChange={setTargetLang} isDark={theme === 'dark'} /></div>
            </div>

            <div className={`border rounded-[2.5rem] shadow-2xl min-h-[160px] relative p-8 group transition-all ${isLoading ? 'opacity-70 grayscale-[0.5]' : ''} ${theme === 'dark' ? 'bg-gradient-to-br from-slate-900 to-slate-950 border-white/5' : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'}`}>
              {isLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/20 backdrop-blur-[2px]">
                   <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                   <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest animate-pulse">Processing...</span>
                </div>
              )}
              <div dir={currentTargetLang?.rtl ? 'rtl' : 'ltr'} className={`text-3xl font-bold leading-relaxed transition-all ${!translatedText ? (theme === 'dark' ? 'text-slate-800 italic' : 'text-slate-300 italic') : (theme === 'dark' ? 'text-white' : 'text-slate-900')} ${currentTargetLang?.rtl ? 'arabic-font' : ''}`}>
                {translatedText || "Translation..."}
              </div>
              {translatedText && (
                <div className="flex flex-wrap items-center justify-end gap-3 mt-6">
                   <div className="relative" ref={exportMenuRef}>
                     <button 
                        onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} 
                        className={`p-4 rounded-2xl transition-all flex items-center gap-2 ${theme === 'dark' ? 'bg-white/5 text-slate-400 hover:text-brand-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:text-brand-600 hover:bg-slate-200'}`}
                        title="Export translation"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <svg className={`w-3 h-3 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isExportMenuOpen && (
                        <div className={`absolute bottom-full right-0 mb-3 w-44 border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-bottom-2 ${theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                          <button onClick={() => handleExport('txt')} className={`w-full text-left px-5 py-3 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest border-b ${theme === 'dark' ? 'border-white/5 text-white' : 'border-slate-100 text-slate-800'}`}>Export TXT</button>
                          <button onClick={() => handleExport('srt')} className={`w-full text-left px-5 py-3 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest border-b ${theme === 'dark' ? 'border-white/5 text-white' : 'border-slate-100 text-slate-800'}`}>Export SRT</button>
                          <button onClick={() => handleExport('pdf')} className={`w-full text-left px-5 py-3 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Export PDF</button>
                        </div>
                      )}
                   </div>
                   <button 
                     onClick={saveCurrentTranslation} 
                     className={`p-4 rounded-2xl transition-all flex items-center gap-2 ${isSaved ? 'bg-yellow-500/20 text-yellow-500' : (theme === 'dark' ? 'bg-white/5 text-slate-400 hover:text-yellow-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:text-yellow-600 hover:bg-slate-200')}`}
                     title={isSaved ? "Saved to phrasebook" : "Save to phrasebook"}
                   >
                     <svg className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                     </svg>
                     <span className="text-xs font-bold">{isSaved ? "Saved" : "Save"}</span>
                   </button>
                   <button onClick={() => playTextToSpeech(translatedText, targetLang)} className={`p-4 rounded-2xl transition-all flex items-center gap-2 ${theme === 'dark' ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}>
                     <SpeechIcon />
                     <span className="text-xs font-bold">Listen</span>
                   </button>
                   <button onClick={() => navigator.clipboard.writeText(translatedText)} className={`p-4 rounded-2xl transition-all ${theme === 'dark' ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}>Copy</button>
                </div>
              )}
            </div>

            {/* History Feed in Main UI */}
            {history.length > 0 && (
              <div className="pt-8">
                <div className="flex items-center justify-between px-2 mb-4">
                  <h2 className={`text-xs font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Recent</h2>
                  <div className="flex items-center gap-4">
                    <div className="relative" ref={historyExportMenuRef}>
                      <button 
                        onClick={() => setIsHistoryExportMenuOpen(!isHistoryExportMenuOpen)}
                        className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${theme === 'dark' ? 'text-slate-600 hover:text-brand-500' : 'text-slate-500 hover:text-brand-600'}`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export History
                      </button>
                      {isHistoryExportMenuOpen && (
                        <div className={`absolute top-full right-0 mt-2 w-32 border rounded-xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 ${theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                          <button onClick={() => handleExportHistory('txt')} className={`w-full text-left px-4 py-2 hover:bg-white/5 text-[9px] font-black uppercase tracking-widest border-b ${theme === 'dark' ? 'border-white/5 text-white' : 'border-slate-100 text-slate-800'}`}>Export TXT</button>
                          <button onClick={() => handleExportHistory('csv')} className={`w-full text-left px-4 py-2 hover:bg-white/5 text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Export CSV</button>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => {
                        if (window.confirm('Are you sure you want to clear your translation history?')) {
                          setHistory([]);
                        }
                      }}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-red-500 transition-colors uppercase tracking-widest group"
                    >
                      <svg className="w-3 h-3 transition-colors group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {history.map(item => (
                    <div key={item.id} className={`p-6 rounded-[2rem] border flex items-center justify-between group transition-all ${theme === 'dark' ? 'bg-slate-900/50 border-white/5 hover:bg-slate-900' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                      <div onClick={() => {setSourceText(item.sourceText); setTranslatedText(item.translatedText);}} className="flex-1 cursor-pointer">
                        <p className={`text-sm mb-1 truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{item.sourceText}</p>
                        <p className={`text-lg font-bold truncate ${item.targetLang === 'badini' ? 'arabic-font' : ''} ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`} dir={item.targetLang === 'badini' ? 'rtl' : 'ltr'}>{item.translatedText}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => playTextToSpeech(item.translatedText, item.targetLang)} className={`p-3 transition-colors ${theme === 'dark' ? 'text-slate-600 hover:text-brand-500' : 'text-slate-400 hover:text-brand-600'}`}>
                          <SpeechIcon />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteHistoryItem(item.id); }} 
                          className={`p-3 transition-colors ${theme === 'dark' ? 'text-slate-600 hover:text-red-500' : 'text-slate-400 hover:text-red-600'}`}
                          title="Delete entry"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {appMode === 'phrasebook' && (
          <div className="max-w-4xl mx-auto p-4 animate-in fade-in slide-in-from-bottom duration-500 pb-24">
            <Phrasebook 
              favorites={favorites} 
              onToggleFavorite={toggleFavorite} 
              onPlayPhrase={(p) => playTextToSpeech(p.badini, 'badini')}
              onSelectPhrase={(p) => { setSourceText(p.english); setTranslatedText(p.badini); setSourceLang('en'); setTargetLang('badini'); setAppMode('translate'); }} 
              userPhrases={userPhrases}
              onDeleteUserPhrase={removeUserPhrase}
              onUpdateUserPhrase={updateUserPhrase}
              isDark={theme === 'dark'} 
            />
          </div>
        )}

        {appMode === 'assistant' && (
          <div className="max-w-4xl mx-auto flex flex-col h-full animate-in fade-in slide-in-from-bottom duration-500">
             <div className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar">
               {chatMessages.map(msg => (
                 <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-2`}>
                   {msg.image && (
                      <div className="max-w-[70%] rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                        <img src={`data:image/jpeg;base64,${msg.image}`} alt="Sent content" className="w-full h-auto" />
                      </div>
                   )}
                   <div className={`max-w-[85%] px-6 py-4 rounded-[1.8rem] shadow-sm ${msg.role === 'user' ? 'bg-brand-600 text-white' : (theme === 'dark' ? 'bg-slate-900 border border-white/10 text-white' : 'bg-white border border-slate-200 text-slate-800')}`}>
                     {msg.text}
                   </div>
                 </div>
               ))}
               <div ref={chatEndRef} />
             </div>
             <div className={`p-6 backdrop-blur-xl shrink-0 pb-24 ${theme === 'dark' ? 'bg-slate-950/80' : 'bg-slate-50/80'}`}>
               
               {/* Image Preview in Input Area */}
               {assistantImage && (
                 <div className="mb-4 flex items-center gap-2 animate-in slide-in-from-bottom-2">
                    <div className="relative group">
                       <img src={`data:image/jpeg;base64,${assistantImage}`} alt="Preview" className="h-20 w-20 object-cover rounded-xl border border-white/10 shadow-lg" />
                       <button onClick={() => setAssistantImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                       </button>
                    </div>
                 </div>
               )}

               <div className={`flex items-center gap-3 border rounded-3xl p-3 shadow-2xl ${theme === 'dark' ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200'}`}>
                 <button onClick={() => imageInputRef.current?.click()} className={`p-3 rounded-2xl transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                 </button>
                 <button onClick={startCamera} className={`p-3 rounded-2xl transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                 </button>
                 <input type="text" value={currentChatInput} onChange={e => setCurrentChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="پسیارەکێ ژ شارەزایی بکە..." className={`flex-1 bg-transparent border-none text-base outline-none px-4 arabic-font ${theme === 'dark' ? 'text-white placeholder-slate-700' : 'text-slate-900 placeholder-slate-400'}`} dir="rtl" />
                 
                 <button onClick={toggleListening} className={`p-3 rounded-2xl transition-all ${isListening && appMode === 'assistant' ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' : (theme === 'dark' ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900')}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                 </button>

                 <button onClick={handleSendMessage} disabled={isStreaming} className={`p-4 rounded-2xl text-white font-bold transition-all ${isStreaming ? 'bg-slate-700 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-500'}`}>
                    {isStreaming ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    )}
                 </button>
               </div>
             </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}></div>
          <div className={`border rounded-[2.5rem] w-full max-w-lg relative overflow-hidden animate-in zoom-in-95 duration-300 shadow-2xl ${theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="p-8 space-y-8 max-h-[85vh] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between">
                <h2 className={`text-2xl font-black uppercase tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Linguistic Tuning</h2>
                <button onClick={() => setIsSettingsOpen(false)} className={`p-2 transition-colors ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}>✕</button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 block">Accuracy & Precision (AI Model)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'auto', label: 'Auto' },
                      { id: 'flash', label: 'Fast' },
                      { id: 'pro', label: 'Pro' }
                    ].map(item => (
                      <button 
                        key={item.id} 
                        onClick={() => setSettings(prev => ({...prev, modelType: item.id as any}))}
                        className={`py-3 rounded-2xl border text-xs font-bold capitalize transition-all ${settings.modelType === item.id ? 'bg-brand-600 border-brand-500 text-white' : (theme === 'dark' ? 'bg-slate-800 border-white/5 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600')}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Temperature (Creativity)</label>
                    <span className="text-xs font-bold text-brand-500">{settings.temperature.toFixed(1)}</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.1" 
                    value={settings.temperature} 
                    onChange={(e) => setSettings(prev => ({...prev, temperature: parseFloat(e.target.value)}))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 block">Region (Sub-Dialect)</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['duhok', 'zakho', 'akre', 'amadiya'].map(region => (
                      <button 
                        key={region} 
                        onClick={() => setSettings(prev => ({...prev, subDialect: region as any}))}
                        className={`py-3 rounded-2xl border text-sm font-bold capitalize transition-all ${settings.subDialect === region ? 'bg-brand-600 border-brand-500 text-white' : (theme === 'dark' ? 'bg-slate-800 border-white/5 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600')}`}
                      >
                        {region}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className={`flex items-center justify-between p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Latin Transliteration</span>
                      <span className="text-[10px] text-slate-500">Show pronunciation guide</span>
                    </div>
                    <button 
                      onClick={() => setSettings(prev => ({...prev, showTransliteration: !prev.showTransliteration}))}
                      className={`w-12 h-6 rounded-full transition-all relative ${settings.showTransliteration ? 'bg-brand-600' : (theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300')}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.showTransliteration ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>

                  <div className={`flex items-center justify-between p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Advanced Orthography</span>
                      <span className="text-[10px] text-slate-500">Use special Kurdish symbols (ڤ, ڕ)</span>
                    </div>
                    <button 
                      onClick={() => setSettings(prev => ({...prev, useAdvancedOrthography: !prev.useAdvancedOrthography}))}
                      className={`w-12 h-6 rounded-full transition-all relative ${settings.useAdvancedOrthography ? 'bg-brand-600' : (theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300')}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.useAdvancedOrthography ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-brand-900/30 transition-all uppercase tracking-widest text-xs"
              >
                Apply Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className={`fixed bottom-0 left-0 right-0 border-t px-4 py-4 flex items-center justify-around z-40 backdrop-blur-2xl ${theme === 'dark' ? 'bg-slate-950/90 border-white/5' : 'bg-white/90 border-slate-200'}`}>
        <button 
          onClick={() => setAppMode('translate')} 
          className={`flex flex-col items-center gap-1 transition-all ${appMode === 'translate' ? 'text-brand-600 dark:text-brand-500' : 'text-slate-400 dark:text-slate-600'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
          <span className="text-[10px] font-bold uppercase tracking-widest">Translate</span>
        </button>
        
        <button 
          onClick={() => setAppMode('phrasebook')} 
          className={`flex flex-col items-center gap-1 transition-all ${appMode === 'phrasebook' ? 'text-brand-600 dark:text-brand-500' : 'text-slate-400 dark:text-slate-600'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          <span className="text-[10px] font-bold uppercase tracking-widest">Phrases</span>
        </button>

        <button 
          onClick={() => setAppMode('assistant')} 
          className={`flex flex-col items-center gap-1 transition-all ${appMode === 'assistant' ? 'text-brand-600 dark:text-brand-500' : 'text-slate-400 dark:text-slate-600'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          <span className="text-[10px] font-bold uppercase tracking-widest">Expert</span>
        </button>
      </nav>

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.pdf,.srt" />
      <input type="file" ref={imageInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />

      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top">
          <div className={`${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'} text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl flex items-center gap-2 border border-white/20 transition-colors`}>
             {toast.type === 'success' && (
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
               </svg>
             )}
             {toast.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
