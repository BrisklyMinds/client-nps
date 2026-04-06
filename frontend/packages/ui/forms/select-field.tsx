'use client'

import { useEffect, useRef, useState } from 'react'
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
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (val: string) => {
    onChange(val)
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsOpen((o) => !o)
    }
    if (e.key === 'Escape') setIsOpen(false)
  }

  return (
    <div className="relative mb-6 flex flex-col last:mb-0" ref={containerRef}>
      <span className="mb-3 block font-medium leading-none">{label}</span>

      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className={twMerge(
          'flex h-11 max-w-lg items-center justify-between rounded-lg bg-white px-4 text-left font-medium shadow-sm outline outline-1 outline-gray-200 transition-all',
          'hover:outline-primary/50 focus:outline-primary focus:ring-4 focus:ring-primary/30',
          isOpen && 'outline-primary ring-4 ring-primary/30',
          error && 'outline-red-400 focus:outline-red-500 focus:ring-red-200',
          disabled && 'cursor-not-allowed opacity-60',
          !selected && 'text-gray-400'
        )}
      >
        <span className="truncate">
          {selected ? selected.label : placeholder ?? 'Выберите...'}
        </span>

        <svg
          className={twMerge(
            'ml-2 h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200',
            isOpen && 'rotate-180 text-primary'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <title>Раскрыть</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="m19 9-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute top-full z-20 mt-1 max-h-60 w-full max-w-lg overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          style={{ animation: 'dropdownIn 150ms ease-out' }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSelect(opt.value)
                }}
                tabIndex={0}
                className={twMerge(
                  'flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                  isSelected
                    ? 'bg-primary/5 font-medium text-primary'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <span
                  className={twMerge(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    isSelected
                      ? 'border-primary bg-primary'
                      : 'border-gray-300'
                  )}
                >
                  {isSelected && (
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <title>Выбрано</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="m5 13 4 4L19 7"
                      />
                    </svg>
                  )}
                </span>
                <span>{opt.label}</span>
              </li>
            )
          })}
        </ul>
      )}

      <style
        // biome-ignore lint/security/noDangerouslySetInnerHtml: CSS keyframes
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes dropdownIn {
              from { opacity: 0; transform: translateY(-4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `
        }}
      />

      {error && <div className="mt-2 text-red-600">{error}</div>}
    </div>
  )
}
