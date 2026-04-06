'use client'

import { useT } from '@/lib/lang-context'

export default function FeedbackSuccessPage() {
  const t = useT()

  return (
    <div className="rounded-lg bg-card p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <svg
          className="h-8 w-8 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <title>{t('success.title')}</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      </div>
      <h1 className="mb-2 text-2xl font-bold">{t('success.title')}</h1>
      <p className="text-muted-foreground">{t('success.desc')}</p>
    </div>
  )
}
