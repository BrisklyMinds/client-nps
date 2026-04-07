import '@frontend/ui/styles/globals.css'
import type { Metadata } from 'next'
import { FeedbackLayoutClient } from '@/components/feedback-layout-client'

export const metadata: Metadata = {
  title: 'Обратная связь - КСВ'
}

export default function FeedbackLayout({
  children
}: {
  children: React.ReactNode
}) {
  return <FeedbackLayoutClient>{children}</FeedbackLayoutClient>
}
