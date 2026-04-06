'use client'

import { useState } from 'react'
import Image from 'next/image'
import { twMerge } from 'tailwind-merge'
import type { Lang } from '@/lib/i18n'
import { LangProvider } from '@/lib/lang-context'

const LANGS: { code: Lang; label: string }[] = [
  { code: 'ky', label: 'KY' },
  { code: 'ru', label: 'RU' },
  { code: 'en', label: 'EN' }
]

const LOGO: Record<Lang, string> = {
  ky: '/logo-ru.svg',
  ru: '/logo-ru.svg',
  en: '/logo-en.svg'
}

export function FeedbackLayoutClient({
  children
}: {
  children: React.ReactNode
}) {
  const [lang, setLang] = useState<Lang>('ru')

  return (
    <LangProvider value={lang}>
      <div className="flex min-h-dvh flex-col items-center bg-background px-4 py-6 sm:px-6 sm:py-10 lg:py-14">
        <div className="mb-5 flex w-full max-w-[480px] items-center justify-between lg:max-w-[540px] sm:mb-8">
          <Image
            src={LOGO[lang]}
            alt="KSW"
            width={180}
            height={50}
            className="h-8 w-auto sm:h-10"
            priority
          />

          <div className="flex gap-1 rounded-lg bg-card p-1 shadow-sm">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                className={twMerge(
                  'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
                  lang === l.code
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full max-w-[480px] lg:max-w-[540px]">{children}</div>
      </div>
    </LangProvider>
  )
}
