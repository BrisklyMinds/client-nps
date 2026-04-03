import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const TYPE_LABELS: Record<string, string> = {
  bug: 'Проблема',
  review: 'Отзыв',
  suggestion: 'Предложение',
  other: 'Другое'
}

interface FeedbackFile {
  id: number
  file: string
  original_name: string
  file_size: number
  content_type: string
}

interface FeedbackDetail {
  id: number
  system: { id: number; name: string; slug: string }
  phone: string
  feedback_type: string
  rating: number | null
  comment: string
  files: FeedbackFile[]
  created_at: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function FeedbackDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  let feedback: FeedbackDetail | null = null

  try {
    const res = await fetch(`${process.env.API_URL}/api/feedback/${id}/`, {
      headers: { Authorization: `Bearer ${session?.accessToken}` },
      cache: 'no-store'
    })
    if (res.ok) {
      feedback = await res.json()
    }
  } catch {
    // fallback
  }

  if (!feedback) return notFound()

  return (
    <div>
      <Link
        href="/admin/feedback"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Назад к списку
      </Link>

      <div className="rounded-lg bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{feedback.system.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(feedback.created_at).toLocaleString('ru-RU')}
            </p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-sm">
            {TYPE_LABELS[feedback.feedback_type] ?? feedback.feedback_type}
          </span>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Телефон</p>
            <p className="font-medium">{feedback.phone}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Рейтинг</p>
            <p className="font-medium">
              {feedback.rating
                ? `${'★'.repeat(feedback.rating)}${'☆'.repeat(5 - feedback.rating)}`
                : '—'}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <p className="mb-2 text-sm text-muted-foreground">Комментарий</p>
          <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4">
            {feedback.comment}
          </p>
        </div>

        {feedback.files.length > 0 && (
          <div>
            <p className="mb-3 text-sm text-muted-foreground">
              Файлы ({feedback.files.length})
            </p>
            <div className="space-y-2">
              {feedback.files.map((file) => {
                const isImage = file.content_type.startsWith('image/')
                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    {isImage ? (
                      <img
                        src={file.file}
                        alt={file.original_name}
                        className="h-12 w-12 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                        FILE
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {file.original_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(file.file_size)}
                      </p>
                    </div>
                    <a
                      href={file.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded bg-muted px-3 py-1.5 text-xs font-medium hover:bg-muted/80"
                    >
                      Скачать
                    </a>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
