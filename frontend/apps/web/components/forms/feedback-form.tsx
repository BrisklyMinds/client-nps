'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { feedbackAction } from '@/actions/feedback-action'
import {
  feedbackFormSchema,
  type FeedbackFormSchema
} from '@/lib/validation'
import { fieldApiError } from '@/lib/forms'
import { TextField } from '@frontend/ui/forms/text-field'
import { TextAreaField } from '@frontend/ui/forms/textarea-field'
import { RadioGroup } from '@frontend/ui/forms/radio-group'
import { StarRating } from '@frontend/ui/forms/star-rating'
import { FileUpload } from '@frontend/ui/forms/file-upload'
import { SubmitField } from '@frontend/ui/forms/submit-field'
import { ErrorMessage } from '@frontend/ui/messages/error-message'

const FEEDBACK_TYPE_OPTIONS = [
  { value: 'bug', label: 'Проблема' },
  { value: 'review', label: 'Отзыв' },
  { value: 'suggestion', label: 'Предложение' },
  { value: 'other', label: 'Другое' }
]

export function FeedbackForm({
  systemSlug,
  systemName
}: {
  systemSlug: string
  systemName: string
}) {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState,
    setError,
    control,
    watch
  } = useForm<FeedbackFormSchema>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      systemSlug,
      feedbackType: 'review',
      rating: null
    }
  })

  const feedbackType = watch('feedbackType')

  const onSubmit = async (data: FeedbackFormSchema) => {
    setServerError(null)

    const formData = new FormData()
    formData.append('system_slug', data.systemSlug)
    formData.append('phone', data.phone)
    formData.append('feedback_type', data.feedbackType)
    if (data.rating) formData.append('rating', String(data.rating))
    formData.append('comment', data.comment)
    for (const file of files) {
      formData.append('files', file)
    }

    const res = await feedbackAction(formData)

    if (res === true) {
      router.push('/feedback/success')
      return
    }

    if (typeof res !== 'boolean') {
      fieldApiError('phone', 'phone', res, setError)
      fieldApiError('comment', 'comment', res, setError)
      fieldApiError('system_slug', 'systemSlug', res, setError)
      fieldApiError('rating', 'rating', res, setError)
      if (res.non_field_errors) {
        setServerError(res.non_field_errors.join('. '))
      }
    }
  }

  return (
    <div className="rounded-lg bg-card p-6 shadow-sm">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Обратная связь</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Система: <span className="font-medium text-foreground">{systemName}</span>
        </p>
      </div>

      {serverError && <ErrorMessage>{serverError}</ErrorMessage>}

      <form onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...register('systemSlug')} />

        <TextField
          type="text"
          label="Телефон"
          placeholder="+996 XXX XXX XXX"
          register={register('phone')}
          formState={formState}
        />

        <Controller
          control={control}
          name="feedbackType"
          render={({ field, fieldState }) => (
            <RadioGroup
              label="Тип обращения"
              options={FEEDBACK_TYPE_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        {feedbackType === 'review' && (
          <Controller
            control={control}
            name="rating"
            render={({ field, fieldState }) => (
              <StarRating
                label="Оценка"
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
        )}

        <TextAreaField
          label="Комментарий"
          placeholder="Опишите вашу проблему или оставьте отзыв..."
          rows={4}
          register={register('comment')}
          formState={formState}
        />

        <FileUpload
          label="Прикрепить файлы"
          files={files}
          onFilesChange={setFiles}
        />

        <SubmitField isLoading={formState.isSubmitting}>
          Отправить
        </SubmitField>
      </form>
    </div>
  )
}
