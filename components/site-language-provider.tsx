"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type SiteLanguage = "english" | "urdu";

export const SITE_LANGUAGE_STORAGE_KEY = "willing-ways:site-language";

interface SiteLanguageContextValue {
  hydrated: boolean;
  isUrdu: boolean;
  language: SiteLanguage;
  setLanguage: (language: SiteLanguage) => void;
}

const SiteLanguageContext = createContext<SiteLanguageContextValue | null>(null);

export function SiteLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SiteLanguage>("english");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(SITE_LANGUAGE_STORAGE_KEY);

    if (storedLanguage === "urdu" || storedLanguage === "english") {
      setLanguageState(storedLanguage);
      document.documentElement.lang = storedLanguage === "urdu" ? "ur" : "en";
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(SITE_LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language === "urdu" ? "ur" : "en";
  }, [hydrated, language]);

  const value = useMemo<SiteLanguageContextValue>(
    () => ({
      hydrated,
      isUrdu: language === "urdu",
      language,
      setLanguage: setLanguageState,
    }),
    [hydrated, language],
  );

  return <SiteLanguageContext.Provider value={value}>{children}</SiteLanguageContext.Provider>;
}

export function useSiteLanguage() {
  const context = useContext(SiteLanguageContext);

  if (!context) {
    throw new Error("useSiteLanguage must be used inside SiteLanguageProvider.");
  }

  return context;
}
