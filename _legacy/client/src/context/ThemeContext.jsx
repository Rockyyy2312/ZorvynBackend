import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const THEMES = [
  { id: 'classic',   name: 'Neon Nexus',    colors: ['#6366f1', '#34d399', '#a78bfa'] },
  { id: 'luxury',    name: 'Obsidian Gold', colors: ['#d4af37', '#c084fc', '#f87171'] },
  { id: 'cyber',     name: 'Cyber Pink',    colors: ['#ec4899', '#818cf8', '#34d399'] },
  { id: 'nordic',    name: 'Arctic Teal',   colors: ['#2dd4bf', '#60a5fa', '#f87171'] },
  { id: 'warm-sand', name: 'Warm Sand',     colors: ['#a0522d', '#2e7d32', '#1565c0'] },
];

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const stored = localStorage.getItem('nexo_theme') || 'classic';
    document.documentElement.setAttribute('data-theme', stored);
    return stored;
  });

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('nexo_theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
