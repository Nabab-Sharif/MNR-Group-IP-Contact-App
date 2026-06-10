import React, { createContext, useContext, useEffect, useState } from 'react';

export type Mode = 'light' | 'dark';

export type ColorTheme = 'navy' | 'emerald' | 'purple' | 'rose' | 'amber' | 'slate' | 'teal' | 'indigo' | 'coral' | 'lime';

export const COLOR_THEMES: { id: ColorTheme; label: string; swatch: string }[] = [
  { id: 'navy', label: 'Navy', swatch: 'linear-gradient(135deg,#001f3f,#003d82)' },
  { id: 'emerald', label: 'Emerald', swatch: 'linear-gradient(135deg,#10b981,#059669)' },
  { id: 'purple', label: 'Purple', swatch: 'linear-gradient(135deg,#a855f7,#9333ea)' },
  { id: 'rose', label: 'Rose', swatch: 'linear-gradient(135deg,#f43f5e,#e11d48)' },
  { id: 'amber', label: 'Amber', swatch: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  { id: 'slate', label: 'Slate', swatch: 'linear-gradient(135deg,#64748b,#475569)' },
  { id: 'teal', label: 'Teal', swatch: 'linear-gradient(135deg,#06b6d4,#0891b2)' },
  { id: 'indigo', label: 'Indigo', swatch: 'linear-gradient(135deg,#6366f1,#4f46e5)' },
  { id: 'coral', label: 'Coral', swatch: 'linear-gradient(135deg,#ff6b6b,#ee5a52)' },
  { id: 'lime', label: 'Lime', swatch: 'linear-gradient(135deg,#84cc16,#65a30d)' },
];

interface ThemeContextType {
  theme: Mode;
  setTheme: (theme: Mode) => void;
  colorTheme: ColorTheme;
  setColorTheme: (c: ColorTheme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Mode>('dark');
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('navy');
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') || 'dark') as Mode;
    const savedColor = (localStorage.getItem('colorTheme') || 'navy') as ColorTheme;
    setThemeState(savedTheme);
    setColorThemeState(savedColor);
    applyMode(savedTheme);
    applyColor(savedColor);
    setMounted(true);
  }, []);

  const applyMode = (newTheme: Mode) => {
    const html = document.documentElement;
    const isDarkMode = newTheme === 'dark';
    html.classList.toggle('dark', isDarkMode);
    setIsDark(isDarkMode);
  };

  const applyColor = (c: ColorTheme) => {
    const html = document.documentElement;
    COLOR_THEMES.forEach(t => html.classList.remove(`theme-${t.id}`));
    html.classList.add(`theme-${c}`);
  };

  const setTheme = (newTheme: Mode) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    applyMode(newTheme);
  };

  const setColorTheme = (c: ColorTheme) => {
    setColorThemeState(c);
    localStorage.setItem('colorTheme', c);
    applyColor(c);
  };

  if (!mounted) return <>{children}</>;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colorTheme, setColorTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
