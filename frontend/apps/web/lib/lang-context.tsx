'use client'

import { createContext, useContext } from 'react'
import { type Lang, translations } from './i18n'

const LangContext = createContext<Lang>('ru')

export const LangProvider = LangContext.Provider

export function useLang(): Lang {
  return useContext(LangContext)
}

export function useT(): (key: string) => string {
  const lang = useLang()
  return (key: string) => translations[lang][key] ?? key
}
