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

  const t = (key: TranslationKey): string => {
    return dictionaries[language]?.[key] || en[key] || key;
  };

  return { t, language };
}
