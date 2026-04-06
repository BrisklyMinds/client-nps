'use client'

import type React from 'react'
import type {
  FieldValues,
  FormState,
  UseFormRegisterReturn
} from 'react-hook-form'
import { twMerge } from 'tailwind-merge'

export function TextAreaField<T extends FieldValues = FieldValues>({
  label,
  placeholder,
  rows = 4,
  register,
  formState
}: {
  label: string
  placeholder?: string
  rows?: number
  register: UseFormRegisterReturn
  formState: FormState<T>
}): React.ReactElement {
  const hasError = formState.errors[register.name]

  return (
    <label className="mb-6 flex flex-col last:mb-0">
      <span className="mb-3 block font-medium leading-none">{label}</span>

      <textarea
        placeholder={placeholder}
        rows={rows}
        className={twMerge(
          'block w-full resize-y rounded bg-white px-4 py-3 font-medium shadow-sm outline outline-1 outline-gray-900/10 focus:outline-primary focus:ring-4 focus:ring-primary/30',
          hasError && 'outline-red-700 focus:outline-red-600 focus:ring-red-300'
        )}
        {...register}
      />

      {hasError && (
        <div className="mt-2 text-red-600">
          {formState.errors[register.name]?.message?.toString()}
        </div>
      )}
    </label>
  )
}
