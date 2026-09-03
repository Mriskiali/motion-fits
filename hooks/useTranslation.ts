import id from '../locales/id.json';
import en from '../locales/en.json';
import { useUserStore } from '../store/useUserStore';

const dictionaries = {
  id,
  en,
};

export type TranslationKey = keyof typeof en;

export function useTranslation() {
  const { language } = useUserStore();

  const t = (key: TranslationKey): string => {
    return dictionaries[language]?.[key] || en[key] || key;
  };

  return { t, language };
}
