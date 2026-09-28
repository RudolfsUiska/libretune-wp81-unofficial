import { createContext, useCallback, useContext, useEffect, ReactNode } from 'react';
import { isMetroBackground, setMetroTheme, useMetroPrefs } from '../metro/theme';

export type ThemeName = 'dark' | 'light' | 'midnight' | 'carbon' | 'synthwave' | 'solarized' | 'nord' | 'dracula' | 'highcontrast';

// Theme metadata for UI display with preview colors
export const THEME_INFO: Record<ThemeName, { label: string; bg: string; primary: string; accent: string }> = {
  dark: { label: 'Dark', bg: '#1a1a1a', primary: '#1976d2', accent: '#ff9800' },
  light: { label: 'Light', bg: '#f5f5f5', primary: '#1976d2', accent: '#f57c00' },
  midnight: { label: 'Midnight', bg: '#0a0e14', primary: '#238636', accent: '#f78166' },
  carbon: { label: 'Carbon', bg: '#000000', primary: '#0f62fe', accent: '#ff832b' },
  synthwave: { label: 'Synthwave', bg: '#1a1a2e', primary: '#ff00ff', accent: '#00ffff' },
  solarized: { label: 'Solarized', bg: '#002b36', primary: '#b58900', accent: '#268bd2' },
  nord: { label: 'Nord', bg: '#2e3440', primary: '#88c0d0', accent: '#bf616a' },
  dracula: { label: 'Dracula', bg: '#282a36', primary: '#bd93f9', accent: '#ff79c6' },
  highcontrast: { label: 'High Contrast', bg: '#000000', primary: '#ffff00', accent: '#00ff00' },
};

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'libretune-theme';

/**
 * The Windows Phone build keeps the theme in the Metro prefs (metro/theme.ts),
 * so LibreTune's theme picker (Settings > Appearance) and the start+theme page
 * are two views of one setting; either one recolours the whole app.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const prefs = useMetroPrefs();
  const theme = prefs.background as ThemeName;

  const setTheme = useCallback((newTheme: ThemeName) => {
    if (!isMetroBackground(newTheme)) return;
    setMetroTheme(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // Applied by applyMetroPrefs too; kept so data-theme is right on mount.
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
