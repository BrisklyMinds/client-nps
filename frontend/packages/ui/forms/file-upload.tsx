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

interface FileEntry {
  id: string
  file: File
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

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
  label,
  texts
}: {
  files: File[]
  onFilesChange: (files: File[]) => void
  error?: string
  label?: string
  texts?: {
    click?: string
    drop?: string
    paste?: string
    max?: string
    perFile?: string
    dropOverlayTitle?: string
    dropOverlayDesc?: string
  }
}): React.ReactElement {
  const clickText = texts?.click ?? 'Нажмите для загрузки'
  const dropText = texts?.drop ?? 'или перетащите файлы'
  const pasteText = texts?.paste ?? 'Также можно вставить из буфера (Ctrl+V).'
  const maxText = texts?.max ?? 'Макс.'
  const perFileText = texts?.perFile ?? 'на файл'
  const overlayTitle = texts?.dropOverlayTitle ?? 'Отпустите для загрузки'
  const overlayDesc = texts?.dropOverlayDesc ?? 'Файлы будут прикреплены к отзыву'
  const inputRef = useRef<HTMLInputElement>(null)
  const previewsRef = useRef<Map<string, string>>(new Map())
  const entriesRef = useRef<FileEntry[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isPageDrag, setIsPageDrag] = useState(false)
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [, forceUpdate] = useState(0)
  const dragCounterRef = useRef(0)

  // Sync entries with files
  useEffect(() => {
    if (files.length === 0) {
      entriesRef.current = []
    } else if (entriesRef.current.length !== files.length) {
      entriesRef.current = files.map((f, i) =>
        entriesRef.current[i]?.file === f
          ? entriesRef.current[i]
          : { id: uid(), file: f }
      )
    }
  }, [files])

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
        const newEntries = validFiles.map((f) => ({ id: uid(), file: f }))
        entriesRef.current = [...entriesRef.current, ...newEntries]
        onFilesChange([...files, ...validFiles])
      }
    },
    [files, onFilesChange]
  )

  const removeFile = useCallback(
    (index: number) => {
      const entry = entriesRef.current[index]
      if (entry) {
        const url = previewsRef.current.get(entry.id)
        if (url) {
          URL.revokeObjectURL(url)
          previewsRef.current.delete(entry.id)
        }
      }
      entriesRef.current = entriesRef.current.filter((_, i) => i !== index)
      onFilesChange(files.filter((_, i) => i !== index))
    },
    [files, onFilesChange]
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run when files array changes
  useEffect(() => {
    let changed = false
    for (const entry of entriesRef.current) {
      if (!previewsRef.current.has(entry.id) && isImage(entry.file)) {
        previewsRef.current.set(entry.id, URL.createObjectURL(entry.file))
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

  // Paste handler
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

  // Fullscreen page-level drag overlay
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      dragCounterRef.current++
      if (e.dataTransfer?.types.includes('Files')) {
        setIsPageDrag(true)
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      dragCounterRef.current--
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0
        setIsPageDrag(false)
        setIsDragging(false)
      }
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      dragCounterRef.current = 0
      setIsPageDrag(false)
      setIsDragging(false)
      if (e.dataTransfer?.files.length) {
        addFiles(e.dataTransfer.files)
      }
    }

    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
    }
  }, [addFiles])

  const handleZoneDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleZoneDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  return (
    <>
      {/* Fullscreen drag overlay */}
      {isPageDrag && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm"
          style={{
            animation: 'fadeIn 200ms ease-out'
          }}
        >
          <div
            className="mx-4 flex max-w-md flex-col items-center rounded-2xl border-4 border-dashed border-primary bg-white/90 p-12 shadow-2xl"
            style={{
              animation: 'scaleIn 250ms ease-out'
            }}
          >
            <div
              className="mb-4 rounded-full bg-primary/10 p-4"
              style={{
                animation: 'bounce 1s ease-in-out infinite'
              }}
            >
              <svg
                className="h-12 w-12 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <title>{overlayTitle}</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
                />
              </svg>
            </div>
            <p className="text-xl font-bold text-foreground">
              {overlayTitle}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {overlayDesc}
            </p>
          </div>
        </div>
      )}

      <style
        // biome-ignore lint/security/noDangerouslySetInnerHtml: CSS keyframes
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleIn {
              from { opacity: 0; transform: scale(0.9); }
              to { opacity: 1; transform: scale(1); }
            }
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
          `
        }}
      />

      <div className="mb-6 last:mb-0">
        {label && (
          <span className="mb-3 block font-medium leading-none">{label}</span>
        )}

        <div
          className={twMerge(
            'cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-all duration-200',
            isDragging
              ? 'scale-[1.02] border-primary bg-primary/5 shadow-lg'
              : 'border-gray-300 hover:border-primary/50'
          )}
          onDragOver={handleZoneDragOver}
          onDragLeave={handleZoneDragLeave}
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
              {clickText}
            </span>{' '}
            {dropText}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {pasteText} {maxText} {formatSize(MAX_FILE_SIZE)} {perFileText}
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

        {entriesRef.current.length > 0 && (
          <div className="mt-3 space-y-2">
            {entriesRef.current.map((entry, index) => {
              const previewUrl = previewsRef.current.get(entry.id)

              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2"
                  style={{
                    animation: 'fadeIn 200ms ease-out'
                  }}
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={entry.file.name}
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
                    <p className="truncate text-sm font-medium">
                      {entry.file.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatSize(entry.file.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="min-h-[44px] min-w-[44px] rounded-md p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(index)
                    }}
                    aria-label={`Удалить ${entry.file.name}`}
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
    </>
  )
}
