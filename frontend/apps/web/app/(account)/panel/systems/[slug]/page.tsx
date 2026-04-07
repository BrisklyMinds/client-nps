'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface SystemDetail {
  id: number
  name: string
  slug: string
  description: string
  is_active: boolean
  created_at: string
}

export default function SystemDetailPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { data: session } = useSession()
  const [system, setSystem] = useState<SystemDetail | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [feedbackUrl, setFeedbackUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [slug, setSlug] = useState<string>('')

  useEffect(() => {
    params.then((p) => setSlug(p.slug))
  }, [params])

  useEffect(() => {
    if (!slug || !session?.accessToken) return

    fetch(`/api/proxy/systems/${slug}/`, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    })
      .catch(() => null)

    // Fetch system details
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
    fetch(`${apiUrl}/api/systems/${slug}/`, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setSystem(data) })
      .catch(() => null)

    // Fetch QR code
    fetch(`${apiUrl}/api/systems/${slug}/qr-code/`, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setQrCode(data.qr_code)
          setFeedbackUrl(data.url)
        }
      })
      .catch(() => null)
  }, [slug, session?.accessToken])

  const copyUrl = async () => {
    await navigator.clipboard.writeText(feedbackUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!system) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Загрузка...
      </div>
    )
  }

  return (
    <div>
      <Link
        href="/panel/systems"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Назад к списку
      </Link>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-card p-6 shadow-sm">
          <h1 className="mb-4 text-xl font-bold">{system.name}</h1>

          <div className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Slug: </span>
              <span className="font-mono">{system.slug}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Статус: </span>
              <span
                className={
                  system.is_active ? 'text-green-600' : 'text-red-600'
                }
              >
                {system.is_active ? 'Активна' : 'Неактивна'}
              </span>
            </div>
            {system.description && (
              <div>
                <span className="text-muted-foreground">Описание: </span>
                <span>{system.description}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Создана: </span>
              <span>
                {new Date(system.created_at).toLocaleDateString('ru-RU')}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-sm text-muted-foreground">Ссылка на форму</p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={feedbackUrl}
                className="min-w-0 flex-1 rounded border bg-muted/50 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={copyUrl}
                className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                {copied ? 'Скопировано!' : 'Копировать'}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">QR-код</h2>
          {qrCode ? (
            <div className="flex flex-col items-center gap-4">
              <img
                src={qrCode}
                alt={`QR-код для ${system.name}`}
                className="h-64 w-64"
              />
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || ''}/api/systems/${system.slug}/qr-code/download/`}
                className="rounded bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80"
              >
                Скачать PNG
              </a>
            </div>
          ) : (
            <p className="py-12 text-center text-muted-foreground">
              Загрузка QR-кода...
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
