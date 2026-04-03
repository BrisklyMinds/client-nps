'use server'

export async function feedbackAction(
  formData: FormData
): Promise<Record<string, string[]> | boolean> {
  try {
    const response = await fetch(`${process.env.API_URL}/api/feedback/`, {
      method: 'POST',
      body: formData
    })

    if (response.ok) return true
    return await response.json()
  } catch {
    return { non_field_errors: ['Ошибка отправки. Попробуйте позже.'] }
  }
}
