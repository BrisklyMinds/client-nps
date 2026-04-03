import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (session === null) {
    return redirect('/')
  }

  return (
    <div className="min-h-dvh bg-background">
      <nav className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link
            href="/admin/dashboard"
            className="text-lg font-bold text-primary"
          >
            NPS Admin
          </Link>
          <div className="flex gap-4 text-sm">
            <Link
              href="/admin/dashboard"
              className="text-muted-foreground hover:text-foreground"
            >
              Дашборд
            </Link>
            <Link
              href="/admin/feedback"
              className="text-muted-foreground hover:text-foreground"
            >
              Отзывы
            </Link>
            <Link
              href="/admin/systems"
              className="text-muted-foreground hover:text-foreground"
            >
              Системы
            </Link>
          </div>
          <div className="ml-auto text-sm text-muted-foreground">
            {session.user?.username}
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}
