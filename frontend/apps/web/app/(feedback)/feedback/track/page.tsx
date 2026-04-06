import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Отслеживание заявки - КСВ'
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  resolved: 'Решена',
  rejected: 'Отклонена'
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700'
}

const TYPE_LABELS: Record<string, string> = {
  bug: 'Проблема',
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

interface TrackData {
  tracking_id: string
  short_id: string
  system_name: string
  feedback_type: string
  status: string
  status_logs: StatusLog[]
  created_at: string
}

export default async function TrackPage({
  searchParams
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams

  if (!id) {
    return (
      <div className="rounded-lg bg-card p-6 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-bold">Отслеживание заявки</h1>
        <p className="text-muted-foreground">
          Введите ID заявки для отслеживания статуса.
        </p>
      </div>
    )
  }

  let data: TrackData | null = null
  try {
    const res = await fetch(
      `${process.env.API_URL}/api/feedback/track/${id}/`,
      { cache: 'no-store' }
    )
    if (res.ok) data = await res.json()
  } catch {
    // fallback
  }

  if (!data) {
    return (
      <div className="rounded-lg bg-card p-6 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-bold">Заявка не найдена</h1>
        <p className="text-muted-foreground">
          Проверьте правильность ID заявки.
        </p>
      </div>
    )
  }

  const statusColor = STATUS_COLORS[data.status] ?? 'bg-gray-100 text-gray-700'

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">ID заявки</p>
            <p className="font-mono text-2xl font-bold tracking-widest text-primary">
              {data.short_id}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${statusColor}`}
          >
            {STATUS_LABELS[data.status] ?? data.status}
          </span>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Система: </span>
            <span className="font-medium">{data.system_name}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Тип: </span>
            <span className="font-medium">
              {TYPE_LABELS[data.feedback_type] ?? data.feedback_type}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Создана: </span>
            <span className="font-medium">
              {new Date(data.created_at).toLocaleString('ru-RU')}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">История статусов</h2>

        {data.status_logs.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Заявка на рассмотрении
          </p>
        ) : (
          <div className="relative space-y-0">
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />
            {data.status_logs.map((log) => (
              <div key={log.id} className="relative flex gap-4 pb-6 last:pb-0">
                <div
                  className={`relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-2 border-white ${
                    STATUS_COLORS[log.status]?.replace('text-', 'bg-').split(' ')[0] ?? 'bg-gray-200'
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
                      Оператор: {log.operator_name}
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
