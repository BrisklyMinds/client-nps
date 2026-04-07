import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { StatusUpdateForm } from '@/components/panel/status-update-form'

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  bug: { label: 'Проблема', color: 'bg-orange-100 text-orange-700' },
  review: { label: 'Отзыв', color: 'bg-blue-100 text-blue-700' },
  suggestion: { label: 'Предложение', color: 'bg-purple-100 text-purple-700' },
  corruption: { label: 'Коррупция', color: 'bg-red-100 text-red-700' },
  other: { label: 'Другое', color: 'bg-gray-100 text-gray-600' }
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: 'Новая', color: 'bg-yellow-100 text-yellow-700' },
  in_progress: { label: 'В работе', color: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'Решена', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Отклонена', color: 'bg-red-100 text-red-700' }
}

interface FeedbackFile {
  id: number
  file: string
  original_name: string
  file_size: number
  content_type: string
}

interface StatusLog {
  id: number
  status: string
  comment: string
  operator_name: string | null
  created_at: string
}

interface FeedbackDetail {
  id: number
  tracking_id: string
  system: { id: number; name: string; slug: string }
  phone: string
  feedback_type: string
  rating: number | null
  comment: string
  status: string
  status_logs: StatusLog[]
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

  const typeInfo = TYPE_LABELS[feedback.feedback_type]
  const statusInfo = STATUS_CONFIG[feedback.status]
  const shortId = feedback.tracking_id
    ? feedback.tracking_id.slice(0, 8).toUpperCase()
    : String(feedback.id)

  return (
    <div className="space-y-5">
      <Link
        href="/panel/feedback"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Назад к списку
      </Link>

      {/* Main card */}
      <div className="rounded-xl bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{feedback.system.name}</h1>
              <span className="font-mono text-sm text-muted-foreground">
                #{shortId}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(feedback.created_at).toLocaleString('ru-RU')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${typeInfo?.color ?? 'bg-muted text-muted-foreground'}`}
            >
              {typeInfo?.label ?? feedback.feedback_type}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${statusInfo?.color ?? 'bg-muted text-muted-foreground'}`}
            >
              {statusInfo?.label ?? feedback.status}
            </span>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {feedback.phone && (
            <div>
              <p className="text-sm text-muted-foreground">Телефон</p>
              <p className="font-medium">{feedback.phone}</p>
            </div>
          )}
          {feedback.rating && (
            <div>
              <p className="text-sm text-muted-foreground">Рейтинг</p>
              <p className="font-medium text-yellow-500">
                {'★'.repeat(feedback.rating)}
                <span className="text-muted-foreground">
                  {'★'.repeat(5 - feedback.rating)}
                </span>
              </p>
            </div>
          )}
        </div>

        <div className="mb-6">
          <p className="mb-2 text-sm text-muted-foreground">Комментарий</p>
          <p className="whitespace-pre-wrap rounded-xl bg-muted/40 p-4 text-sm leading-relaxed">
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
                    className="flex items-center gap-3 rounded-xl border border-border p-3"
                  >
                    {isImage ? (
                      <img
                        src={file.file}
                        alt={file.original_name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
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
                      className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium hover:bg-muted/70"
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

      {/* Status history */}
      {feedback.status_logs.length > 0 && (
        <div className="rounded-xl bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">История статусов</h2>
          <div className="space-y-3">
            {feedback.status_logs.map((log, idx) => {
              const logStatus = STATUS_CONFIG[log.status]
              return (
                <div key={log.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-2.5 w-2.5 rounded-full mt-1.5 ${log.status === 'resolved' ? 'bg-green-400' : log.status === 'rejected' ? 'bg-red-400' : log.status === 'in_progress' ? 'bg-blue-400' : 'bg-yellow-400'}`}
                    />
                    {idx < feedback.status_logs.length - 1 && (
                      <div className="mt-1 w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${logStatus?.color ?? 'bg-muted text-muted-foreground'}`}
                      >
                        {logStatus?.label ?? log.status}
                      </span>
                      {log.operator_name && (
                        <span className="text-xs text-muted-foreground">
                          {log.operator_name}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString('ru-RU')}
                      </span>
                    </div>
                    {log.comment && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {log.comment}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Update status */}
      <StatusUpdateForm feedbackId={feedback.id} currentStatus={feedback.status} />
    </div>
  )
}
