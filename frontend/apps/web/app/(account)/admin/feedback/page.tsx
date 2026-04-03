import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Отзывы - NPS Admin'
}

const TYPE_LABELS: Record<string, string> = {
  bug: 'Проблема',
  review: 'Отзыв',
  suggestion: 'Предложение',
  other: 'Другое'
}

interface FeedbackItem {
  id: number
  system_name: string
  phone: string
  feedback_type: string
  rating: number | null
  comment: string
  files_count: number
  created_at: string
}

export default async function FeedbackListPage({
  searchParams
}: {
  searchParams: Promise<{
    system__slug?: string
    feedback_type?: string
    page?: string
  }>
}) {
  const session = await getServerSession(authOptions)
  const params = await searchParams

  const query = new URLSearchParams()
  if (params.system__slug) query.set('system__slug', params.system__slug)
  if (params.feedback_type) query.set('feedback_type', params.feedback_type)
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Отзывы ({count})</h1>
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/feedback/export/?${query.toString()}`}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Экспорт CSV
        </a>
      </div>

      <div className="overflow-hidden rounded-lg bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Система</th>
                <th className="px-4 py-3 font-medium">Тип</th>
                <th className="px-4 py-3 font-medium">Телефон</th>
                <th className="px-4 py-3 font-medium">Рейтинг</th>
                <th className="px-4 py-3 font-medium">Файлы</th>
                <th className="px-4 py-3 font-medium">Дата</th>
              </tr>
            </thead>
            <tbody>
              {results.map((fb) => (
                <tr key={fb.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/feedback/${fb.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {fb.system_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-1 text-xs">
                      {TYPE_LABELS[fb.feedback_type] ?? fb.feedback_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">{fb.phone}</td>
                  <td className="px-4 py-3">
                    {fb.rating ? `${'★'.repeat(fb.rating)}${'☆'.repeat(5 - fb.rating)}` : '—'}
                  </td>
                  <td className="px-4 py-3">{fb.files_count || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(fb.created_at).toLocaleDateString('ru-RU')}
                  </td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Нет отзывов
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
