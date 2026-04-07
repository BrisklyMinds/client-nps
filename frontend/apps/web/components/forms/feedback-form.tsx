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
  const [showCorruptionWarning, setShowCorruptionWarning] = useState(false)
  const [pendingTypeChange, setPendingTypeChange] = useState<
    ((v: string) => void) | null
  >(null)

  const feedbackTypeOptions = [
    { value: 'bug', label: t('feedback.type.bug') },
    { value: 'review', label: t('feedback.type.review') },
    { value: 'suggestion', label: t('feedback.type.suggestion') },
    { value: 'corruption', label: t('feedback.type.corruption') },
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

    if ('tracking_id' in res) {
      router.push(`/feedback/success?id=${res.tracking_id}`)
      return
    }

    if (!('tracking_id' in res)) {
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
    <>
      {showCorruptionWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCorruptionWarning(false)}
          />
          <div className="relative w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-5 w-5 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {t('corruption.warning.title')}
                </h3>
              </div>
            </div>

            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              {t('corruption.warning.text')}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCorruptionWarning(false)
                  if (pendingTypeChange) {
                    pendingTypeChange('corruption')
                    setPendingTypeChange(null)
                  }
                }}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                {t('corruption.warning.confirm')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCorruptionWarning(false)
                  setPendingTypeChange(null)
                }}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                {t('corruption.warning.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white p-5 shadow-md sm:p-8">
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

          {feedbackType !== 'corruption' && (
            <TextField
              type="text"
              label={t('feedback.phone')}
              placeholder={t('feedback.phone.placeholder')}
              register={register('phone')}
              formState={formState}
            />
          )}

          <Controller
            control={control}
            name="feedbackType"
            render={({ field, fieldState }) => (
              <RadioGroup
                label={t('feedback.type')}
                options={feedbackTypeOptions}
                value={field.value}
                onChange={(v) => {
                  if (v === 'corruption') {
                    setPendingTypeChange(() => field.onChange)
                    setShowCorruptionWarning(true)
                  } else {
                    field.onChange(v)
                  }
                }}
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
    </>
  )
}
