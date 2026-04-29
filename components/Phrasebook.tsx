
import React, { useState } from 'react';
import { PHRASES, PHRASE_CATEGORIES } from '../constants';
import { Phrase } from '../types';

interface PhrasebookProps {
  onSelectPhrase: (phrase: Phrase) => void;
  onToggleFavorite: (id: string) => void;
  onPlayPhrase: (phrase: Phrase) => void;
  favorites: string[];
  userPhrases?: Phrase[];
  onDeleteUserPhrase?: (id: string) => void;
  onUpdateUserPhrase?: (phrase: Phrase) => void;
  isDark?: boolean;
}

const Phrasebook: React.FC<PhrasebookProps> = ({ 
  onSelectPhrase, 
  onToggleFavorite, 
  onPlayPhrase, 
  favorites, 
  userPhrases = [],
  onDeleteUserPhrase,
  onUpdateUserPhrase,
  isDark 
}) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [editingPhrase, setEditingPhrase] = useState<Phrase | null>(null);

  const allPhrases = [...PHRASES, ...userPhrases];

  const getFilteredPhrases = () => {
    if (activeCategory === 'favorites') {
      return allPhrases.filter(p => favorites.includes(p.id));
    }
    if (activeCategory === 'personal') {
      return userPhrases;
    }
    return activeCategory === 'all' 
      ? allPhrases 
      : allPhrases.filter(p => p.category === activeCategory);
  };

  const filteredPhrases = getFilteredPhrases();

  const categoriesWithFav = [
    { id: 'favorites', name: 'Saved', icon: '❤️' },
    { id: 'personal', name: 'My Phrases', icon: '👤' },
    ...PHRASE_CATEGORIES
  ];

  const SpeechIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  );

  return (
    <section className="bg-white dark:bg-[#111827] rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            Badini Phrasebook
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Essential expressions for Behdinan region.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categoriesWithFav.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeCategory === cat.id 
                ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPhrases.length > 0 ? (
          filteredPhrases.map(phrase => {
            const isUserPhrase = phrase.id.toString().startsWith('user-');
            return (
              <div key={phrase.id} className="relative group">
                <button
                  onClick={() => onSelectPhrase(phrase)}
                  className="w-full h-full flex flex-col p-5 bg-gray-50 dark:bg-[#1f2937]/50 border border-gray-100 dark:border-gray-800 rounded-2xl text-left transition-all hover:bg-white dark:hover:bg-[#1f2937] hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md"
                >
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                    {phrase.category}
                  </span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{phrase.english}</span>
                  <span className="text-lg font-bold text-gray-800 dark:text-gray-100 arabic-font line-clamp-2" dir="rtl">
                    {phrase.badini}
                  </span>
                </button>
                
                <div className="absolute top-3 right-3 flex flex-col gap-1">
                  {isUserPhrase ? (
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setEditingPhrase(phrase);
                        }}
                        className="p-2 rounded-full text-gray-300 dark:text-gray-600 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        title="Edit phrase"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (window.confirm('Delete this phrase from your personal collection?')) {
                            onDeleteUserPhrase?.(phrase.id); 
                          }
                        }}
                        className="p-2 rounded-full text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete phrase"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite(phrase.id); }}
                      className={`p-2 rounded-full transition-all ${favorites.includes(phrase.id) ? 'text-red-500 bg-red-50 dark:bg-red-500/10' : 'text-gray-300 dark:text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100'}`}
                    >
                      <svg className="w-5 h-5" fill={favorites.includes(phrase.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); onPlayPhrase(phrase); }}
                    className="p-2 rounded-full text-gray-300 dark:text-gray-600 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <SpeechIcon />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-500 dark:text-gray-600 space-y-2">
            <p className="text-sm font-bold uppercase tracking-widest">No phrases found</p>
          </div>
        )}
      </div>

      {editingPhrase && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingPhrase(null)}></div>
          <div className="bg-white dark:bg-[#111827] border border-gray-100 dark:border-gray-800 rounded-[2rem] w-full max-w-md relative overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold dark:text-white">Edit Phrase</h3>
                <button onClick={() => setEditingPhrase(null)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white">✕</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">English</label>
                  <input 
                    type="text" 
                    value={editingPhrase.english}
                    onChange={(e) => setEditingPhrase({...editingPhrase, english: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Badini</label>
                  <input 
                    type="text" 
                    dir="rtl"
                    value={editingPhrase.badini}
                    onChange={(e) => setEditingPhrase({...editingPhrase, badini: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-lg font-bold arabic-font focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Category</label>
                  <select 
                    value={editingPhrase.category}
                    onChange={(e) => setEditingPhrase({...editingPhrase, category: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  >
                    <option value="personal">Personal</option>
                    {PHRASE_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                onClick={() => {
                  onUpdateUserPhrase?.(editingPhrase);
                  setEditingPhrase(null);
                }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Phrasebook;
