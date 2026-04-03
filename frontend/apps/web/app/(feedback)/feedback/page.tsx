import { FeedbackForm } from '@/components/forms/feedback-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Оставить отзыв - КСВ'
}

export default async function FeedbackPage({
  searchParams
}: {
  searchParams: Promise<{ system?: string }>
}) {
  const { system } = await searchParams

  if (!system) {
    return (
      <div className="rounded-lg bg-card p-6 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-bold">Система не указана</h1>
        <p className="text-muted-foreground">
          Пожалуйста, отсканируйте QR-код для перехода к форме обратной связи.
        </p>
      </div>
    )
  }

  let systemName = system
  try {
    const res = await fetch(
      `${process.env.API_URL}/api/systems/${system}/public/`,
      { cache: 'no-store' }
    )
    if (res.ok) {
      const data = await res.json()
      systemName = data.name
    }
  } catch {
    // Use slug as fallback name
  }

  return <FeedbackForm systemSlug={system} systemName={systemName} />
}
