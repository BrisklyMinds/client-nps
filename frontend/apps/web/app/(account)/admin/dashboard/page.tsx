import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Дашборд - NPS Admin'
}

const TYPE_LABELS: Record<string, string> = {
  bug: 'Проблемы',
  review: 'Отзывы',
  suggestion: 'Предложения',
  corruption: 'Коррупция',
  other: 'Другое'
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  new: {
    label: 'Новые',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    dot: 'bg-yellow-400'
  },
  in_progress: {
    label: 'В работе',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-400'
  },
  resolved: {
    label: 'Решённые',
    bg: 'bg-green-50',
    text: 'text-green-700',
    dot: 'bg-green-400'
  },
  rejected: {
    label: 'Отклонённые',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-400'
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  let stats = {
    total_count: 0,
    average_rating: null as number | null,
    by_type: {} as Record<string, number>,
    by_system: [] as Array<{ system__name: string; count: number }>,
    by_status: {} as Record<string, number>
  }

  try {
    const res = await fetch(`${process.env.API_URL}/api/feedback/stats/`, {
      headers: {
        Authorization: `Bearer ${session?.accessToken}`
      },
      cache: 'no-store'
    })
    if (res.ok) stats = await res.json()
  } catch {
    // fallback to empty stats
  }

  const statusOrder = ['new', 'in_progress', 'resolved', 'rejected']

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Дашборд</h1>

      {/* Summary cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Всего заявок</p>
          <p className="mt-1 text-3xl font-bold">{stats.total_count}</p>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Средний рейтинг</p>
          <p className="mt-1 text-3xl font-bold">
            {stats.average_rating ? stats.average_rating.toFixed(1) : '—'}
          </p>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Систем</p>
          <p className="mt-1 text-3xl font-bold">{stats.by_system.length}</p>
        </div>
      </div>

      {/* Status cards */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">По статусам</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {statusOrder.map((s) => {
            const cfg = STATUS_CONFIG[s]
            const count = stats.by_status[s] ?? 0
            return (
              <div
                key={s}
                className={`flex flex-col gap-1 rounded-xl p-4 shadow-sm ${cfg.bg}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                  <span className={`text-sm font-medium ${cfg.text}`}>
                    {cfg.label}
                  </span>
                </div>
                <p className={`text-2xl font-bold ${cfg.text}`}>{count}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* By type */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">По типам</h2>
        <div className="grid gap-3 sm:grid-cols-5">
          {Object.entries(stats.by_type).map(([type, count]) => (
            <div
              key={type}
              className="flex items-center justify-between rounded-xl bg-card p-4 shadow-sm"
            >
              <span className="text-sm">{TYPE_LABELS[type] ?? type}</span>
              <span className="text-lg font-bold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* By system */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">По системам</h2>
        <div className="overflow-hidden rounded-xl bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Система</th>
                <th className="px-4 py-3 text-right font-medium">Заявок</th>
              </tr>
            </thead>
            <tbody>
              {stats.by_system.map((item) => (
                <tr key={item.system__name} className="border-b last:border-0">
                  <td className="px-4 py-3">{item.system__name}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {item.count}
                  </td>
                </tr>
              ))}
              {stats.by_system.length === 0 && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Пока нет данных
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
