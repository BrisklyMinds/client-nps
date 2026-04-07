import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'

const NAV_LINKS = [
  { href: '/panel/dashboard', label: 'Дашборд' },
  { href: '/panel/feedback', label: 'Заявки' },
  { href: '/panel/processed', label: 'Обработанные' },
  { href: '/panel/systems', label: 'Системы' },
]

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
      <nav className="sticky top-0 z-10 border-b bg-card shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-0">
          <Link
            href="/panel/dashboard"
            className="shrink-0 py-3 text-base font-bold text-primary"
          >
            NPS
          </Link>

          <div className="flex flex-1 items-center gap-1 overflow-x-auto">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {session.user?.username}
            </span>
            <Link
              href="/api/auth/signout"
              className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            >
              Выйти
            </Link>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
