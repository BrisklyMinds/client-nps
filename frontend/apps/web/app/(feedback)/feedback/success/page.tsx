'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { useT } from '@/lib/lang-context'

function SuccessContent() {
  const t = useT()
  const searchParams = useSearchParams()
  const trackingId = searchParams.get('id') ?? ''
  const shortId = trackingId.slice(0, 8).toUpperCase()
  const [copied, setCopied] = useState(false)

  const trackUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/feedback/track?id=${trackingId}`
      : ''

  const handleCopy = async () => {
    await navigator.clipboard.writeText(trackUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="rounded-xl bg-white p-6 text-center shadow-md sm:p-8">
      <style
        // biome-ignore lint/security/noDangerouslySetInnerHtml: CSS animations
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes checkDraw {
              0% { stroke-dashoffset: 48; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes circleScale {
              0% { transform: scale(0); opacity: 0; }
              50% { transform: scale(1.15); }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes fadeUp {
              0% { opacity: 0; transform: translateY(16px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            @keyframes pulse {
              0%, 100% { box-shadow: 0 0 0 0 hsl(170 42% 53% / 0.4); }
              50% { box-shadow: 0 0 0 12px hsl(170 42% 53% / 0); }
            }
            .check-circle { animation: circleScale 0.5s ease-out forwards; }
            .check-path { stroke-dasharray: 48; stroke-dashoffset: 48; animation: checkDraw 0.4s ease-out 0.4s forwards; }
            .fade-up-1 { opacity: 0; animation: fadeUp 0.4s ease-out 0.7s forwards; }
            .fade-up-2 { opacity: 0; animation: fadeUp 0.4s ease-out 0.9s forwards; }
            .fade-up-3 { opacity: 0; animation: fadeUp 0.4s ease-out 1.1s forwards; }
            .pulse-ring { animation: pulse 2s ease-in-out 1s infinite; }
            @media print {
              .no-print { display: none !important; }
              .print-only { display: block !important; }
            }
          `
        }}
      />

      <div className="check-circle pulse-ring mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <svg
          className="h-10 w-10 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <title>{t('success.title')}</title>
          <path
            className="check-path"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      </div>

      <h1 className="fade-up-1 mb-2 text-2xl font-bold">
        {t('success.title')}
      </h1>
      <p className="fade-up-1 text-muted-foreground">
        {t('success.desc')}
      </p>

      {trackingId && (
        <>
          <div className="fade-up-2 mx-auto mt-6 max-w-xs rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4">
            <p className="text-xs text-muted-foreground">ID заявки</p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-primary">
              {shortId}
            </p>
            <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
              {trackingId}
            </p>
          </div>

          <div className="fade-up-3 mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center no-print">
            <a
              href={`/feedback/track?id=${trackingId}`}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              Отследить заявку
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
            >
              {copied ? 'Скопировано!' : 'Поделиться ссылкой'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
            >
              Распечатать
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function FeedbackSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  )
}
