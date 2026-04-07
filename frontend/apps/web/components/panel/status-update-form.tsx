'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

const STATUS_OPTIONS = [
  { value: 'new', label: 'Новая' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'resolved', label: 'Решена' },
  { value: 'rejected', label: 'Отклонена' }
]

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200'
}

export function StatusUpdateForm({
  feedbackId,
  currentStatus
}: {
  feedbackId: number
  currentStatus: string
}) {
  const router = useRouter()
  const { data: session } = useSession()
  const [status, setStatus] = useState(currentStatus)
  const [comment, setComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsLoading(true)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/feedback/${feedbackId}/update-status/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(session as { accessToken?: string })?.accessToken ?? ''}`
          },
          body: JSON.stringify({ status, comment })
        }
      )

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.detail ?? 'Ошибка при обновлении статуса')
      } else {
        setSuccess(true)
        setComment('')
        router.refresh()
      }
    } catch {
      setError('Ошибка соединения')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-xl bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold">Обновить статус</h2>

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          Статус обновлён
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Новый статус
          </label>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                  status === opt.value
                    ? STATUS_COLORS[opt.value]
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="operator-comment"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Комментарий оператора{' '}
            <span className="text-muted-foreground">(необязательно)</span>
          </label>
          <textarea
            id="operator-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Опишите причину изменения статуса..."
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || status === currentStatus}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </form>
    </div>
  )
}
