'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { twMerge } from 'tailwind-merge'
import type { Lang } from '@/lib/i18n'
import { LangProvider } from '@/lib/lang-context'
import { useT } from '@/lib/lang-context'

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

function Header({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const t = useT()
  return (
    <div className="mb-5 flex w-full max-w-[480px] flex-col gap-2 lg:max-w-[540px] sm:mb-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="cursor-pointer">
          <Image
            src={LOGO[lang]}
            alt="KSW"
            width={180}
            height={50}
            className="h-8 w-auto sm:h-10"
            priority
          />
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/status"
            className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            {t('status.link')}
          </Link>
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
      </div>
    </div>
  )
}

export function FeedbackLayoutClient({
  children
}: {
  children: React.ReactNode
}) {
  const [lang, setLang] = useState<Lang>('ru')

  return (
    <LangProvider value={lang}>
      <div
        className="flex min-h-dvh flex-col items-center px-4 py-6 sm:px-6 sm:py-10 lg:py-14"
        style={{
          backgroundColor: 'hsl(var(--background))',
          backgroundImage: 'url(/pattern-tile.png)',
          backgroundRepeat: 'repeat',
          backgroundSize: '80px 80px',
        }}
      >
        <Header lang={lang} setLang={setLang} />
        <div className="w-full max-w-[480px] lg:max-w-[540px]">{children}</div>
      </div>
    </LangProvider>
  )
}
