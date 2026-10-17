import { useState, useRef, useEffect } from 'react';
import { Search, Mic, LoaderCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface SearchSuggestion {
  id: string;
  label: string;
  sublabel?: string;
  designation?: string;
  department?: string;
  extension?: string;
  type: 'person' | 'department' | 'extension' | 'office';
  value: string;
}

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  onSelectSuggestion?: (s: SearchSuggestion) => void;
  enableVoiceSearch?: boolean;
}

const SearchBar = ({ value, onChange, placeholder = 'Search by name, ext, department...', suggestions = [], onSelectSuggestion, enableVoiceSearch = false }: SearchBarProps) => {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isListening, setIsListening] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const recognitionRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionCtor = (window as Window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition
      || (window as Window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    // Listen in the user's own language; the transcript is translated to English before searching.
    recognition.lang = navigator.language || 'en-US';
    recognition.onresult = async (event: any) => {
      const transcript = Array.from(event.results || [])
        .map((result: any) => result[0]?.transcript ?? '')
        .join('')
        .trim();

      setIsListening(false);
      if (!transcript) return;

      onChangeRef.current(transcript);
      setOpen(true);
      setSelectedIndex(-1);

      const isAscii = /^[\x00-\x7F]*$/.test(transcript);
      const isBanglaLocale = (navigator.language || '').toLowerCase().startsWith('bn');
      if (isAscii && !isBanglaLocale) return; // plain English — search as spoken

      try {
        setIsTranslating(true);
        const { data, error } = await supabase.functions.invoke('translate-search', { body: { text: transcript } });
        const translated = (data as { text?: string } | null)?.text?.trim();
        if (!error && translated) {
          onChangeRef.current(translated);
          setOpen(true);
        }
      } catch {
        /* keep original transcript */
      } finally {
        setIsTranslating(false);
      }
    };
    recognition.onerror = (event: any) => {
      const message = event.error === 'not-allowed'
        ? 'Microphone permission is required for voice search.'
        : 'Voice search could not be completed.';
      toast.error(message);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.stop?.();
    };
  }, []);


  // Scroll selected item into view when using keyboard navigation
  useEffect(() => {
    if (selectedIndex >= 0 && buttonsRef.current[selectedIndex] && dropdownRef.current) {
      buttonsRef.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const showDropdown = open && focused && value.trim().length > 0 && suggestions.length > 0;
  const visibleSuggestions = suggestions.slice(0, 8);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < visibleSuggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < visibleSuggestions.length) {
          const selected = visibleSuggestions[selectedIndex];
          onSelectSuggestion?.(selected);
          setOpen(false);
          setSelectedIndex(-1);
        }
        break;
      case 'Escape':
        setOpen(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  const handleSuggestionClick = (s: SearchSuggestion) => {
    onSelectSuggestion?.(s);
    setOpen(false);
    setSelectedIndex(-1);
  };

  const handleVoiceSearch = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      toast.error('Voice search is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    recognition.lang = navigator.language || 'en-US';
    recognition.start();
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
      <Input
        ref={inputRef}
        value={value}
        onChange={e => { onChange(e.target.value.replace(/[^\x20-\x7E]/g, '')); setOpen(true); setSelectedIndex(-1); }}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        dir="ltr"
        className="pl-10 pr-10 h-9 text-sm rounded-lg border-slate-300 dark:border-slate-600 shadow-none w-full min-w-0 text-left"
      />
      {enableVoiceSearch && (
        <button
          type="button"
          onClick={handleVoiceSearch}
          title="Voice search — speak any language, searched in English"
          className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full p-1.5 transition-all ${isListening || isTranslating ? 'bg-red-500 text-white animate-pulse' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
        >
          {isListening || isTranslating ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
        </button>
      )}
      {showDropdown && (
        <>
          <style>{`
            .search-dropdown::-webkit-scrollbar {
              width: 8px;
            }
            .search-dropdown::-webkit-scrollbar-track {
              background: transparent;
            }
            .search-dropdown::-webkit-scrollbar-thumb {
              background-color: #ea580c;
              border-radius: 4px;
            }
            .search-dropdown::-webkit-scrollbar-thumb:hover {
              background-color: #c2410c;
            }
            .dark .search-dropdown::-webkit-scrollbar-thumb {
              background-color: #fb923c;
            }
            .dark .search-dropdown::-webkit-scrollbar-thumb:hover {
              background-color: #ea580c;
            }
          `}</style>
          <div
            ref={dropdownRef}
            className="search-dropdown absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg max-h-80 overflow-y-auto min-w-72 sm:min-w-96"
          >
            {visibleSuggestions.map((s, idx) => (
              <button
                ref={(el) => {
                  buttonsRef.current[idx] = el;
                }}
                key={s.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSuggestionClick(s);
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full px-2 sm:px-4 py-2 sm:py-3 text-left transition-all border-l-2 border-r-2 border-t border-b ${idx === selectedIndex
                    ? 'bg-cyan-100 dark:bg-cyan-900/40 border-l-cyan-500 border-r-cyan-500 border-t-cyan-500 border-b-cyan-500 dark:border-l-cyan-400 dark:border-r-cyan-400 dark:border-t-cyan-400 dark:border-b-cyan-400'
                    : 'border-l-slate-200 border-r-slate-200 border-t-slate-200 border-b-slate-200 dark:border-l-slate-700 dark:border-r-slate-700 dark:border-t-slate-700 dark:border-b-slate-700 hover:border-l-cyan-400 hover:border-r-cyan-400 hover:border-t-cyan-400 hover:border-b-cyan-400 dark:hover:border-l-cyan-500 dark:hover:border-r-cyan-500 dark:hover:border-t-cyan-500 dark:hover:border-b-cyan-500'
                  }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Left side: Extension or placeholder (centered) */}
                  {s.extension ? (
                    <div className="flex-shrink-0 flex items-center justify-center">
                      <span className="search-ext-badge text-[10px] sm:text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-2 sm:px-3 py-1 sm:py-2 rounded whitespace-nowrap">
                        {s.extension}
                      </span>
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded bg-slate-100 dark:bg-slate-800" />
                  )}

                  {/* Right side: Name, Designation, Department, Office */}
                  <span className="flex-1 min-w-0">
                    {/* Line 1: Name */}
                    <span className="block text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {s.label}
                    </span>

                    {/* Line 2: Designation and Department */}
                    {(s.designation || s.department) && (
                      <span className="block text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
                        {s.designation && <span>{s.designation}</span>}
                        {s.designation && s.department && <span>, </span>}
                        {s.department && <span>{s.department}</span>}
                      </span>
                    )}

                    {/* Line 3: Unit/Office name */}
                    {s.sublabel && (
                      <span className="block text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 sm:mt-1">
                        {s.sublabel}
                      </span>
                    )}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default SearchBar;
