'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type React from 'react'
import { twMerge } from 'tailwind-merge'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_FILES = 10
const ACCEPTED_TYPES = [
  'image/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]

function isImage(file: File): boolean {
  return file.type.startsWith('image/')
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUpload({
  files,
  onFilesChange,
  error,
  label
}: {
  files: File[]
  onFilesChange: (files: File[]) => void
  error?: string
  label?: string
}): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null)
  const previewsRef = useRef<Map<string, string>>(new Map())
  const [isDragging, setIsDragging] = useState(false)
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [, forceUpdate] = useState(0)

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const errors: string[] = []
      const validFiles: File[] = []

      for (const file of Array.from(newFiles)) {
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: превышает ${formatSize(MAX_FILE_SIZE)}`)
          continue
        }
        validFiles.push(file)
      }

      const total = files.length + validFiles.length
      if (total > MAX_FILES) {
        errors.push(`Максимум ${MAX_FILES} файлов`)
        validFiles.splice(MAX_FILES - files.length)
      }

      setFileErrors(errors)
      if (validFiles.length > 0) {
        onFilesChange([...files, ...validFiles])
      }
    },
    [files, onFilesChange]
  )

  const removeFile = useCallback(
    (index: number) => {
      const key = `${files[index].name}-${files[index].size}`
      const url = previewsRef.current.get(key)
      if (url) {
        URL.revokeObjectURL(url)
        previewsRef.current.delete(key)
      }
      onFilesChange(files.filter((_, i) => i !== index))
    },
    [files, onFilesChange]
  )

  useEffect(() => {
    let changed = false
    for (const file of files) {
      const key = `${file.name}-${file.size}`
      if (!previewsRef.current.has(key) && isImage(file)) {
        previewsRef.current.set(key, URL.createObjectURL(file))
        changed = true
      }
    }
    if (changed) forceUpdate((n) => n + 1)
  }, [files])

  useEffect(() => {
    const currentPreviews = previewsRef.current
    return () => {
      for (const url of currentPreviews.values()) {
        URL.revokeObjectURL(url)
      }
    }
  }, [])

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const pastedFiles: File[] = []
      for (const item of Array.from(items)) {
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) pastedFiles.push(file)
        }
      }
      if (pastedFiles.length > 0) {
        e.preventDefault()
        addFiles(pastedFiles)
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [addFiles])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  return (
    <div className="mb-6 last:mb-0">
      {label && (
        <span className="mb-3 block font-medium leading-none">{label}</span>
      )}

      <div
        className={twMerge(
          'cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 hover:border-primary/50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
      >
        <svg
          className="mx-auto mb-2 h-8 w-8 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <title>Загрузка файлов</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
          />
        </svg>
        <p className="text-sm text-gray-600">
          <span className="font-medium text-primary">
            Нажмите для загрузки
          </span>{' '}
          или перетащите файлы
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Также можно вставить из буфера (Ctrl+V). Макс. {formatSize(MAX_FILE_SIZE)} на файл
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, index) => {
            const key = `${file.name}-${file.size}`
            const previewUrl = previewsRef.current.get(key)

            return (
              <div
                key={key}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2"
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <title>Файл</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                      />
                    </svg>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  className="min-h-[44px] min-w-[44px] rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                  aria-label={`Удалить ${file.name}`}
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <title>Удалить</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {fileErrors.map((err) => (
        <div key={err} className="mt-2 text-sm text-red-600">
          {err}
        </div>
      ))}
      {error && <div className="mt-2 text-red-600">{error}</div>}
    </div>
  )
}
