import { useCallback, useMemo } from 'react';
import id from '../locales/id.json';
import en from '../locales/en.json';
import { useUserStore } from '../store/useUserStore';

const dictionaries: Record<string, Record<string, string>> = {
  id,
  en,
};

export type TranslationKey = keyof typeof en;

export function useTranslation() {
  const language = useUserStore((s) => s.language);

  // Stable `t` function: only changes when the active language changes, so it can be
  // safely used in useMemo/useCallback dependency arrays without busting memoization.
  const t = useCallback(
    (key: TranslationKey): string => {
      return dictionaries[language]?.[key] || en[key] || key;
    },
    [language]
  );

  return useMemo(() => ({ t, language }), [t, language]);
}
