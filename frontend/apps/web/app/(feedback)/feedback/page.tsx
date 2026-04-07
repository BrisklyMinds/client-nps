import { redirect } from 'next/navigation'

export default async function FeedbackRedirectPage({
  searchParams
}: {
  searchParams: Promise<{ system?: string }>
}) {
  const { system } = await searchParams
  const target = system ? `/?system=${system}` : '/'
  redirect(target)
}
