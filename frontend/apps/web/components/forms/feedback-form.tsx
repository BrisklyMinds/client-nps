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
import { useT } from '@/lib/lang-context'
import { TextField } from '@frontend/ui/forms/text-field'
import { TextAreaField } from '@frontend/ui/forms/textarea-field'
import { SelectField } from '@frontend/ui/forms/select-field'
import { RadioGroup } from '@frontend/ui/forms/radio-group'
import { StarRating } from '@frontend/ui/forms/star-rating'
import { FileUpload } from '@frontend/ui/forms/file-upload'
import { SubmitField } from '@frontend/ui/forms/submit-field'
import { ErrorMessage } from '@frontend/ui/messages/error-message'

interface SystemOption {
  name: string
  slug: string
}

export function FeedbackForm({
  systems,
  preselectedSlug
}: {
  systems: SystemOption[]
  preselectedSlug?: string
}) {
  const router = useRouter()
  const t = useT()
  const [files, setFiles] = useState<File[]>([])
  const [serverError, setServerError] = useState<string | null>(null)

  const feedbackTypeOptions = [
    { value: 'bug', label: t('feedback.type.bug') },
    { value: 'review', label: t('feedback.type.review') },
    { value: 'suggestion', label: t('feedback.type.suggestion') },
    { value: 'other', label: t('feedback.type.other') }
  ]

  const systemOptions = systems.map((s) => ({
    value: s.slug,
    label: s.name
  }))

  const defaultSlug =
    preselectedSlug && systems.some((s) => s.slug === preselectedSlug)
      ? preselectedSlug
      : ''

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
      systemSlug: defaultSlug,
      feedbackType: 'review',
      rating: null
    }
  })

  const feedbackType = watch('feedbackType')
  const selectedSlug = watch('systemSlug')
  const selectedSystem = systems.find((s) => s.slug === selectedSlug)

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
        <h1 className="text-xl font-bold">{t('feedback.title')}</h1>
        {selectedSystem && (
          <p className="mt-1 text-sm text-muted-foreground">
            {t('feedback.system.label')}{' '}
            <span className="font-medium text-foreground">
              {selectedSystem.name}
            </span>
          </p>
        )}
      </div>

      {serverError && <ErrorMessage>{serverError}</ErrorMessage>}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Controller
          control={control}
          name="systemSlug"
          render={({ field, fieldState }) => (
            <SelectField
              label={t('feedback.system')}
              options={systemOptions}
              value={field.value}
              onChange={field.onChange}
              placeholder={t('feedback.system.placeholder')}
              error={fieldState.error?.message}
              disabled={!!preselectedSlug && defaultSlug !== ''}
            />
          )}
        />

        <TextField
          type="text"
          label={t('feedback.phone')}
          placeholder={t('feedback.phone.placeholder')}
          register={register('phone')}
          formState={formState}
        />

        <Controller
          control={control}
          name="feedbackType"
          render={({ field, fieldState }) => (
            <RadioGroup
              label={t('feedback.type')}
              options={feedbackTypeOptions}
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
                label={t('feedback.rating')}
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
        )}

        <TextAreaField
          label={t('feedback.comment')}
          placeholder={t('feedback.comment.placeholder')}
          rows={4}
          register={register('comment')}
          formState={formState}
        />

        <FileUpload
          label={t('feedback.files')}
          files={files}
          onFilesChange={setFiles}
          texts={{
            click: t('feedback.files.click'),
            drop: t('feedback.files.drop'),
            paste: t('feedback.files.paste'),
            max: t('feedback.files.max'),
            perFile: t('feedback.files.perFile'),
            dropOverlayTitle: t('drop.title'),
            dropOverlayDesc: t('drop.desc'),
          }}
        />

        <SubmitField isLoading={formState.isSubmitting}>
          {t('feedback.submit')}
        </SubmitField>
      </form>
    </div>
  )
}
