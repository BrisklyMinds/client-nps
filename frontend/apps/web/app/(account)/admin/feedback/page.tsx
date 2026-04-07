import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Заявки - NPS Admin'
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  bug: { label: 'Проблема', color: 'bg-orange-100 text-orange-700' },
  review: { label: 'Отзыв', color: 'bg-blue-100 text-blue-700' },
  suggestion: { label: 'Предложение', color: 'bg-purple-100 text-purple-700' },
  corruption: { label: 'Коррупция', color: 'bg-red-100 text-red-700' },
  other: { label: 'Другое', color: 'bg-gray-100 text-gray-600' }
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  new: { label: 'Новая', color: 'bg-yellow-100 text-yellow-700' },
  in_progress: { label: 'В работе', color: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'Решена', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Отклонена', color: 'bg-red-100 text-red-700' }
}

const STATUS_FILTERS = [
  { value: '', label: 'Все' },
  { value: 'new', label: 'Новые' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'resolved', label: 'Решённые' },
  { value: 'rejected', label: 'Отклонённые' }
]

interface FeedbackItem {
  id: number
  tracking_id: string
  system_name: string
  phone: string
  feedback_type: string
  rating: number | null
  comment: string
  status: string
  files_count: number
  created_at: string
}

export default async function FeedbackListPage({
  searchParams
}: {
  searchParams: Promise<{
    system__slug?: string
    feedback_type?: string
    status?: string
    page?: string
  }>
}) {
  const session = await getServerSession(authOptions)
  const params = await searchParams

  const query = new URLSearchParams()
  if (params.system__slug) query.set('system__slug', params.system__slug)
  if (params.feedback_type) query.set('feedback_type', params.feedback_type)
  if (params.status) query.set('status', params.status)
  if (params.page) query.set('page', params.page)

  let results: FeedbackItem[] = []
  let count = 0

  try {
    const res = await fetch(
      `${process.env.API_URL}/api/feedback/?${query.toString()}`,
      {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
        cache: 'no-store'
      }
    )
    if (res.ok) {
      const data = await res.json()
      results = data.results ?? []
      count = data.count ?? 0
    }
  } catch {
    // fallback
  }

  const currentStatus = params.status ?? ''

  function buildUrl(status: string) {
    const q = new URLSearchParams(query)
    if (status) {
      q.set('status', status)
    } else {
      q.delete('status')
    }
    q.delete('page')
    return `/admin/feedback?${q.toString()}`
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Заявки ({count})</h1>
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/feedback/export/?${query.toString()}`}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Экспорт CSV
        </a>
      </div>

      {/* Status filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={buildUrl(f.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              currentStatus === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:text-foreground shadow-sm'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Система</th>
                <th className="px-4 py-3 font-medium">Тип</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Телефон</th>
                <th className="px-4 py-3 font-medium">Рейтинг</th>
                <th className="px-4 py-3 font-medium">Дата</th>
              </tr>
            </thead>
            <tbody>
              {results.map((fb) => {
                const typeInfo = TYPE_LABELS[fb.feedback_type]
                const statusInfo = STATUS_CONFIG[fb.status]
                const shortId = fb.tracking_id
                  ? fb.tracking_id.slice(0, 8).toUpperCase()
                  : String(fb.id)
                return (
                  <tr
                    key={fb.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/feedback/${fb.id}`}
                        className="font-mono text-xs font-semibold text-primary hover:underline"
                      >
                        #{shortId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">{fb.system_name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${typeInfo?.color ?? 'bg-muted text-muted-foreground'}`}
                      >
                        {typeInfo?.label ?? fb.feedback_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo?.color ?? 'bg-muted text-muted-foreground'}`}
                      >
                        {statusInfo?.label ?? fb.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {fb.phone || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {fb.rating
                        ? `${'★'.repeat(fb.rating)}${'☆'.repeat(5 - fb.rating)}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(fb.created_at).toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                )
              })}
              {results.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    Нет заявок
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
