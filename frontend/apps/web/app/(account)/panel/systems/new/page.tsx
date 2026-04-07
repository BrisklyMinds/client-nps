'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewSystemPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [name, setName] = useState('')
  const [nameKy, setNameKy] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleNameChange = (value: string) => {
    setName(value)
    setSlug(generateSlug(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
      const res = await fetch(`${apiUrl}/api/systems/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`
        },
        body: JSON.stringify({ name, name_ky: nameKy, name_en: nameEn, slug, description })
      })

      if (res.ok) {
        router.push('/panel/systems')
        return
      }

      const data = await res.json()
      const messages = Object.values(data)
        .flat()
        .join('. ')
      setError(messages || 'Ошибка создания системы')
    } catch {
      setError('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Link
        href="/panel/systems"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Назад к списку
      </Link>

      <div className="mx-auto max-w-lg rounded-lg bg-card p-6 shadow-sm">
        <h1 className="mb-6 text-xl font-bold">Новая система</h1>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="mb-4 flex flex-col">
            <span className="mb-2 text-sm font-medium">Название</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="rounded border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="Например: Единое Окно"
            />
          </label>

          <label className="mb-4 flex flex-col">
            <span className="mb-2 text-sm font-medium">
              Название на кыргызском <span className="text-muted-foreground">(необязательно)</span>
            </span>
            <input
              type="text"
              value={nameKy}
              onChange={(e) => setNameKy(e.target.value)}
              className="rounded border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="Мисалы: Бирдиктүү Терезе"
            />
          </label>

          <label className="mb-4 flex flex-col">
            <span className="mb-2 text-sm font-medium">
              Название на английском <span className="text-muted-foreground">(необязательно)</span>
            </span>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="rounded border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="E.g.: Single Window"
            />
          </label>

          <label className="mb-4 flex flex-col">
            <span className="mb-2 text-sm font-medium">Slug (URL)</span>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="rounded border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="edinoe-okno"
            />
          </label>

          <label className="mb-6 flex flex-col">
            <span className="mb-2 text-sm font-medium">
              Описание (необязательно)
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-y rounded border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-primary px-4 py-2.5 font-medium text-primary-foreground disabled:opacity-60"
          >
            {loading ? 'Создание...' : 'Создать систему'}
          </button>
        </form>
      </div>
    </div>
  )
}
