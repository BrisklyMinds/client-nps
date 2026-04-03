'use client'

import type React from 'react'
import { twMerge } from 'tailwind-merge'

interface RadioOption {
  value: string
  label: string
}

export function RadioGroup({
  label,
  options,
  value,
  onChange,
  error
}: {
  label: string
  options: RadioOption[]
  value: string
  onChange: (value: string) => void
  error?: string
}): React.ReactElement {
  return (
    <div className="mb-6 last:mb-0">
      <span className="mb-3 block font-medium leading-none">{label}</span>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={twMerge(
              'min-h-[44px] rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              value === option.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-gray-200 bg-white text-gray-700 hover:border-primary/50 hover:bg-primary/5'
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {error && <div className="mt-2 text-red-600">{error}</div>}
    </div>
  )
}
