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
    <div className="flex min-h-dvh flex-col items-center bg-background px-4 py-6 sm:px-6 sm:py-10 lg:py-14">
      <div className="mb-5 flex items-center gap-2.5 sm:mb-8">
        <Image
          src="/logo.svg"
          alt="KSW"
          width={36}
          height={30}
          className="h-7 w-auto sm:h-8"
          priority
        />
        <span className="text-sm font-bold tracking-tight text-foreground sm:text-base">
          Kyrgyz Single Window
        </span>
      </div>
      <div className="w-full max-w-[480px] lg:max-w-[540px]">{children}</div>
    </div>
  )
}
