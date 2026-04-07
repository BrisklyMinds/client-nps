import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Статус систем - КСВ'
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  resolved: 'Решена',
  rejected: 'Отклонена'
}

const STATUS_EMOJI: Record<string, string> = {
  new: '\u{1F7E1}',
  in_progress: '\u{1F7E0}',
  resolved: '\u2705',
  rejected: '\u274C'
}

const TYPE_LABELS: Record<string, string> = {
  bug: 'Системная проблема',
  review: 'Отзыв',
  suggestion: 'Предложение',
  other: 'Другое'
}

interface StatusLog {
  id: number
  status: string
  comment: string
  operator_name: string | null
  created_at: string
}

interface Incident {
  short_id: string
  system_name: string
  feedback_type: string
  comment: string
  status: string
  status_logs: StatusLog[]
  created_at: string
}

function groupByDate(incidents: Incident[]): Record<string, Incident[]> {
  const groups: Record<string, Incident[]> = {}
  for (const inc of incidents) {
    const date = new Date(inc.created_at).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    if (!groups[date]) groups[date] = []
    groups[date].push(inc)
  }
  return groups
}

export default async function StatusPage() {
  let incidents: Incident[] = []
  try {
    const res = await fetch(
      `${process.env.API_URL}/api/feedback/incidents/`,
      { cache: 'no-store' }
    )
    if (res.ok) incidents = await res.json()
  } catch {
    // fallback
  }

  const grouped = groupByDate(incidents)
  const today = new Date().toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const allResolved = incidents.every(
    (i) => i.status === 'resolved' || i.status === 'rejected'
  )

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-8 rounded-xl bg-white p-6 shadow-md">
        <div className="flex items-center gap-3">
          <div
            className={`h-4 w-4 rounded-full ${
              allResolved ? 'bg-green-500' : 'bg-yellow-500'
            }`}
          />
          <h1 className="text-xl font-bold">
            {allResolved
              ? 'Все системы работают нормально'
              : 'Есть активные обращения'}
          </h1>
        </div>
      </div>

      <div className="space-y-6">
        {Object.keys(grouped).length === 0 && (
          <div className="border-l-2 border-gray-200 pl-4 py-3">
            <h2 className="text-lg font-semibold">{today}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Нет публичных обращений.
            </p>
          </div>
        )}

        {Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <h2 className="mb-3 text-lg font-semibold">{date}</h2>

            <div className="space-y-3">
              {items.map((inc) => (
                <div
                  key={inc.short_id}
                  className="rounded-xl border border-border bg-white p-4"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">
                        {inc.system_name} — {TYPE_LABELS[inc.feedback_type] ?? inc.feedback_type}
                      </h3>
                    </div>
                    <span className="shrink-0 text-sm">
                      {STATUS_EMOJI[inc.status]}{' '}
                      {STATUS_LABELS[inc.status] ?? inc.status}
                    </span>
                  </div>

                  {inc.status_logs.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                      {inc.status_logs.map((log) => (
                        <div key={log.id} className="text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              {STATUS_LABELS[log.status] ?? log.status}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleString(
                                'ru-RU'
                              )}
                            </span>
                          </div>
                          {log.comment && (
                            <p className="mt-0.5 text-muted-foreground">
                              {log.comment}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {inc.status_logs.length === 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {inc.comment.length > 200
                        ? `${inc.comment.slice(0, 200)}...`
                        : inc.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
