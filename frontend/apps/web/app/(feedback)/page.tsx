import { FeedbackForm } from '@/components/forms/feedback-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Обратная связь - КСВ'
}

interface SystemOption {
  name: string
  slug: string
}

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ system?: string }>
}) {
  const { system: preselectedSlug } = await searchParams

  let systems: SystemOption[] = []
  try {
    const res = await fetch(`${process.env.API_URL}/api/systems/active/`, {
      cache: 'no-store'
    })
    if (res.ok) {
      const data = await res.json()
      systems = (data.results ?? data ?? []).map(
        (s: { name: string; slug: string }) => ({
          name: s.name,
          slug: s.slug
        })
      )
    }
  } catch {
    // fallback empty
  }

  if (systems.length === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-md">
        <h1 className="mb-2 text-xl font-bold">Нет доступных систем</h1>
        <p className="text-muted-foreground">
          Обратитесь к администратору для создания системы.
        </p>
      </div>
    )
  }

  return (
    <FeedbackForm
      systems={systems}
      preselectedSlug={preselectedSlug}
    />
  )
}
