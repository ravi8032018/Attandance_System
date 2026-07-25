"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "portal_theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
        setThemeState(savedTheme);
      }
    } catch (e) {
      // LocalStorage fallback
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    const systemQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      let active: "light" | "dark" = "dark";
      if (theme === "system") {
        active = systemQuery.matches ? "dark" : "light";
      } else {
        active = theme;
      }

      setResolvedTheme(active);

      if (active === "dark") {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.remove("dark");
        root.classList.add("light");
      }
    }

    applyTheme();

    function handleSystemChange() {
      if (theme === "system") {
        applyTheme();
      }
    }

    systemQuery.addEventListener("change", handleSystemChange);
    return () => systemQuery.removeEventListener("change", handleSystemChange);
  }, [theme, mounted]);

  function setTheme(newTheme: Theme) {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch (e) {
      // LocalStorage fallback
    }
  }

  function toggleTheme() {
    if (resolvedTheme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
