'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useT } from '@/lib/lang-context'

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700'
}

interface StatusLog {
  id: number
  status: string
  comment: string
  operator_name: string | null
  created_at: string
}

interface TrackData {
  tracking_id: string
  short_id: string
  system_name: string
  feedback_type: string
  status: string
  status_logs: StatusLog[]
  created_at: string
}

function CopyableId({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group inline-flex items-center gap-2 rounded-md transition-colors"
      title="Нажмите чтобы скопировать"
    >
      <span className="font-mono text-2xl font-bold leading-none tracking-widest text-primary group-hover:text-primary/70">
        {text}
      </span>
      <span className="flex h-6 w-6 items-center justify-center text-muted-foreground group-hover:text-primary">
        {copied ? (
          <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <title>Скопировано</title>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <title>Копировать</title>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
          </svg>
        )}
      </span>
    </button>
  )
}

function TrackContent() {
  const t = useT()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [data, setData] = useState<TrackData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const STATUS_LABELS: Record<string, string> = {
    new: t('feedback.status.new') ?? 'Новая',
    in_progress: t('feedback.status.in_progress') ?? 'В работе',
    resolved: t('feedback.status.resolved') ?? 'Решена',
    rejected: t('feedback.status.rejected') ?? 'Отклонена'
  }

  const TYPE_LABELS: Record<string, string> = {
    bug: t('feedback.type.bug'),
    review: t('feedback.type.review'),
    suggestion: t('feedback.type.suggestion'),
    corruption: t('feedback.type.corruption'),
    other: t('feedback.type.other')
  }

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    fetch(`/api/feedback/track/${id}/`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setData(d)
        else setNotFound(true)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 text-center shadow-md">
        <p className="text-muted-foreground">{t('track.loading')}</p>
      </div>
    )
  }

  if (!id || notFound || !data) {
    return (
      <div className="rounded-xl bg-white p-6 text-center shadow-md">
        <h1 className="mb-2 text-xl font-bold">{t('track.notFound.title')}</h1>
        <p className="text-muted-foreground">{t('track.notFound.desc')}</p>
      </div>
    )
  }

  const statusColor = STATUS_COLORS[data.status] ?? 'bg-gray-100 text-gray-700'

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-6 shadow-md">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{t('track.id')}</p>
            <CopyableId text={data.short_id} />
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${statusColor}`}
          >
            {STATUS_LABELS[data.status] ?? data.status}
          </span>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">{t('track.system')}: </span>
            <span className="font-medium">{data.system_name}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{t('track.type')}: </span>
            <span className="font-medium">
              {TYPE_LABELS[data.feedback_type] ?? data.feedback_type}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">{t('track.created')}: </span>
            <span className="font-medium">
              {new Date(data.created_at).toLocaleString('ru-RU')}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold">{t('track.history')}</h2>

        {data.status_logs.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t('track.pending')}
          </p>
        ) : (
          <div className="relative space-y-0">
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />
            {data.status_logs.map((log) => (
              <div key={log.id} className="relative flex gap-4 pb-6 last:pb-0">
                <div
                  className={`relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-2 border-white ${
                    STATUS_COLORS[log.status]?.split(' ')[0] ?? 'bg-gray-200'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {STATUS_LABELS[log.status] ?? log.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString('ru-RU')}
                    </span>
                  </div>
                  {log.comment && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {log.comment}
                    </p>
                  )}
                  {log.operator_name && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t('track.operator')}: {log.operator_name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TrackPage() {
  return (
    <Suspense fallback={null}>
      <TrackContent />
    </Suspense>
  )
}
