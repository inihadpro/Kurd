
import React from 'react';
import { LANGUAGES } from '../constants';

interface LanguageSelectorProps {
  value: string;
  onChange: (code: string) => void;
  label: string;
  isDark?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ value, onChange, label, isDark }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name} ({lang.nativeName})
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
