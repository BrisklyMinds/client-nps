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

function Navbar({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const t = useT()
  return (
    <header className="sticky top-0 z-20 w-full border-b border-border/40 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex-shrink-0">
          <Image
            src={LOGO[lang]}
            alt="KSW"
            width={160}
            height={44}
            className="h-8 w-auto sm:h-9"
            priority
          />
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/status"
            className="hidden text-xs font-medium text-muted-foreground transition-colors hover:text-primary sm:block"
          >
            {t('status.link')}
          </Link>
          {/* Status on mobile — icon only */}
          <Link
            href="/status"
            className="block sm:hidden text-muted-foreground hover:text-primary"
            title={t('status.link')}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
            </svg>
          </Link>
          <div className="flex gap-0.5 rounded-lg bg-muted p-0.5">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                className={twMerge(
                  'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
                  lang === l.code
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
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
      <div className="flex min-h-dvh flex-col">
        <Navbar lang={lang} setLang={setLang} />
        <main
          className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-12"
          style={{
            backgroundImage: 'url(/pattern-tile.png)',
            backgroundRepeat: 'repeat',
            backgroundSize: '80px 80px',
            backgroundColor: 'hsl(var(--background))',
          }}
        >
          <div className="w-full max-w-xl lg:max-w-2xl">{children}</div>
        </main>
      </div>
    </LangProvider>
  )
}
