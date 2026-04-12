"use client";

import { useState, useEffect, useCallback } from 'react';

export function useTheme(defaultTheme = 'system') {
  const [theme, setThemeState] = useState(defaultTheme);

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (storedTheme && storedTheme !== 'system') {
      setThemeState(storedTheme);
    } else if (systemPrefersDark) {
      setThemeState('dark');
    } else {
      setThemeState('light');
    }
  }, []);

  const applyTheme = useCallback((newTheme) => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (newTheme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
        return;
    }
    
    root.classList.add(newTheme);
  }, []);


  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  const setTheme = (newTheme) => {
    localStorage.setItem('theme', newTheme);
    setThemeState(newTheme);
    applyTheme(newTheme);
  };

  return { theme, setTheme };
}