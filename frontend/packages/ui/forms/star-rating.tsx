'use client'

import { useState } from 'react'
import type React from 'react'
import { twMerge } from 'tailwind-merge'

function StarIcon({
  filled,
  className
}: {
  filled: boolean
  className?: string
}): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      className={twMerge('h-8 w-8 sm:h-10 sm:w-10', className)}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <title>Звезда</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
      />
    </svg>
  )
}

export function StarRating({
  value,
  onChange,
  error,
  label
}: {
  value: number | null | undefined
  onChange: (rating: number) => void
  error?: string
  label?: string
}): React.ReactElement {
  const [hovered, setHovered] = useState<number | null>(null)
  const displayValue = hovered ?? value ?? 0

  return (
    <div className="mb-6 last:mb-0">
      {label && (
        <span className="mb-3 block font-medium leading-none">{label}</span>
      )}
      <div
        className="flex gap-1"
        onMouseLeave={() => setHovered(null)}
        role="radiogroup"
        aria-label={label ?? 'Rating'}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={twMerge(
              'min-h-[44px] min-w-[44px] cursor-pointer rounded-md p-1 transition-colors',
              'hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary',
              displayValue >= star ? 'text-primary' : 'text-gray-300'
            )}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            aria-checked={value === star}
            role="radio"
          >
            <StarIcon filled={displayValue >= star} />
          </button>
        ))}
      </div>
      {error && <div className="mt-2 text-red-600">{error}</div>}
    </div>
  )
}
