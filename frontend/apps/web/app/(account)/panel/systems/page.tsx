import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Системы - NPS Admin'
}

interface SystemItem {
  id: number
  name: string
  slug: string
  feedback_count: number
  average_rating: number | null
}

export default async function SystemsListPage() {
  const session = await getServerSession(authOptions)

  let systems: SystemItem[] = []

  try {
    const res = await fetch(`${process.env.API_URL}/api/systems/`, {
      headers: { Authorization: `Bearer ${session?.accessToken}` },
      cache: 'no-store'
    })
    if (res.ok) {
      const data = await res.json()
      systems = data.results ?? data ?? []
    }
  } catch {
    // fallback
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Системы</h1>
        <Link
          href="/panel/systems/new"
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Добавить систему
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Название</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 text-right font-medium">Отзывов</th>
              <th className="px-4 py-3 text-right font-medium">Рейтинг</th>
            </tr>
          </thead>
          <tbody>
            {systems.map((sys) => (
              <tr key={sys.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/panel/systems/${sys.slug}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {sys.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{sys.slug}</td>
                <td className="px-4 py-3 text-right">{sys.feedback_count}</td>
                <td className="px-4 py-3 text-right">
                  {sys.average_rating ? sys.average_rating.toFixed(1) : '—'}
                </td>
              </tr>
            ))}
            {systems.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Нет систем
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
