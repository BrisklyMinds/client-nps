'use client'

import type React from 'react'
import { twMerge } from 'tailwind-merge'

interface SelectOption {
  value: string
  label: string
}

export function SelectField({
  label,
  options,
  value,
  onChange,
  placeholder,
  error,
  disabled
}: {
  label: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  disabled?: boolean
}): React.ReactElement {
  return (
    <label className="mb-6 flex flex-col last:mb-0">
      <span className="mb-3 block font-medium leading-none">{label}</span>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={twMerge(
          'block h-10 max-w-lg appearance-none rounded bg-white px-4 pr-10 font-medium shadow-sm outline outline-1 outline-gray-900/10 focus:outline-primary focus:ring-4 focus:ring-primary/30',
          error && 'outline-red-700 focus:outline-red-600 focus:ring-red-300',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {error && <div className="mt-2 text-red-600">{error}</div>}
    </label>
  )
}
