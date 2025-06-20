import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // İlk yüklemede localStorage'dan tema ayarını al
    const savedTheme = localStorage.getItem('theme') as Theme;
    return savedTheme || 'dark';
  });

  // Tema değiştiğinde belgeye tema class'ını ekle ve localStorage'a kaydet
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Mevcut tema classlarını temizle
    root.classList.remove('light-theme', 'dark-theme');
    
    // Yeni tema classını ekle
    root.classList.add(`${theme}-theme`);
    
    // HTML elementine data-theme attribute'unu ekle (tailwind için)
    root.setAttribute('data-theme', theme);
    
    // Koyu tema için HTML'e dark class'ı ekle (tailwind-dark mode için)
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Local storage'a kaydet
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
} 