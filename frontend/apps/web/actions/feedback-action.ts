'use server'

export async function feedbackAction(
  formData: FormData
): Promise<{ tracking_id: string } | Record<string, string[]>> {
  try {
    const response = await fetch(`${process.env.API_URL}/api/feedback/`, {
      method: 'POST',
      body: formData
    })

    if (response.ok) {
      const data = await response.json()
      return { tracking_id: data.tracking_id }
    }
    return await response.json()
  } catch {
    return { non_field_errors: ['Ошибка отправки. Попробуйте позже.'] }
  }
}
