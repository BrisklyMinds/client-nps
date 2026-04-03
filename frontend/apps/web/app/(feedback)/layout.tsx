import '@frontend/ui/styles/globals.css'
import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Обратная связь - КСВ'
}

export default function FeedbackLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-background px-4 py-8">
      <div className="mb-8">
        <Image src="/logo.svg" alt="KSW Logo" width={120} height={100} priority />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
