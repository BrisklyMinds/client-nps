import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Обработанные заявки - NPS Admin'
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  bug: { label: 'Проблема', color: 'bg-orange-100 text-orange-700' },
  review: { label: 'Отзыв', color: 'bg-blue-100 text-blue-700' },
  suggestion: { label: 'Предложение', color: 'bg-purple-100 text-purple-700' },
  corruption: { label: 'Коррупция', color: 'bg-red-100 text-red-700' },
  other: { label: 'Другое', color: 'bg-gray-100 text-gray-600' }
}

interface ProcessedItem {
  id: number
  tracking_id: string
  system_name: string
  feedback_type: string
  status: string
  comment: string
  created_at: string
}

async function fetchCount(
  token: string | undefined,
  status: string
): Promise<number> {
  try {
    const res = await fetch(
      `${process.env.API_URL}/api/feedback/?status=${status}&page_size=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      }
    )
    if (res.ok) {
      const data = await res.json()
      return data.count ?? 0
    }
  } catch {
    // fallback
  }
  return 0
}

export default async function ProcessedPage({
  searchParams
}: {
  searchParams: Promise<{
    status?: string
    system__slug?: string
    page?: string
  }>
}) {
  const session = await getServerSession(authOptions)
  const params = await searchParams

  const activeStatus = params.status ?? 'resolved'

  const query = new URLSearchParams()
  query.set('status', activeStatus)
  if (params.system__slug) query.set('system__slug', params.system__slug)
  if (params.page) query.set('page', params.page)

  let results: ProcessedItem[] = []
  let count = 0
  let resolvedCount = 0
  let rejectedCount = 0

  const [feedRes, rCount, rjCount] = await Promise.all([
    fetch(`${process.env.API_URL}/api/feedback/?${query.toString()}`, {
      headers: { Authorization: `Bearer ${session?.accessToken}` },
      cache: 'no-store'
    }).catch(() => null),
    fetchCount(session?.accessToken, 'resolved'),
    fetchCount(session?.accessToken, 'rejected')
  ])

  if (feedRes?.ok) {
    const data = await feedRes.json()
    results = data.results ?? []
    count = data.count ?? 0
  }
  resolvedCount = rCount
  rejectedCount = rjCount

  const today = new Date().toLocaleDateString('ru-RU')

  function buildUrl(status: string) {
    const q = new URLSearchParams()
    q.set('status', status)
    if (params.system__slug) q.set('system__slug', params.system__slug)
    return `/admin/processed?${q.toString()}`
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Обработанные заявки</h1>
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/feedback/export/?${query.toString()}`}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Экспорт CSV
        </a>
      </div>

      {/* Stats bar */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-green-50 p-4 shadow-sm">
          <p className="text-sm font-medium text-green-600">Решено всего</p>
          <p className="mt-1 text-2xl font-bold text-green-700">
            {resolvedCount}
          </p>
        </div>
        <div className="rounded-xl bg-red-50 p-4 shadow-sm">
          <p className="text-sm font-medium text-red-600">Отклонено всего</p>
          <p className="mt-1 text-2xl font-bold text-red-700">
            {rejectedCount}
          </p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            Показываем
          </p>
          <p className="mt-1 text-2xl font-bold">{count}</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex gap-2">
        <Link
          href={buildUrl('resolved')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeStatus === 'resolved'
              ? 'bg-green-600 text-white'
              : 'bg-card text-muted-foreground shadow-sm hover:text-foreground'
          }`}
        >
          Решённые ({resolvedCount})
        </Link>
        <Link
          href={buildUrl('rejected')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeStatus === 'rejected'
              ? 'bg-red-600 text-white'
              : 'bg-card text-muted-foreground shadow-sm hover:text-foreground'
          }`}
        >
          Отклонённые ({rejectedCount})
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Система</th>
                <th className="px-4 py-3 font-medium">Тип</th>
                <th className="px-4 py-3 font-medium">Фрагмент</th>
                <th className="px-4 py-3 font-medium">Дата создания</th>
              </tr>
            </thead>
            <tbody>
              {results.map((fb) => {
                const typeInfo = TYPE_LABELS[fb.feedback_type]
                const shortId = fb.tracking_id
                  ? fb.tracking_id.slice(0, 8).toUpperCase()
                  : String(fb.id)
                const preview =
                  fb.comment.length > 60
                    ? `${fb.comment.slice(0, 60)}…`
                    : fb.comment
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
                    <td className="px-4 py-3 text-muted-foreground">
                      {preview}
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
                    colSpan={5}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    Нет обработанных заявок
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
