'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DocumentIcon,
  CloudArrowUpIcon,
  ArrowPathIcon,
} from '@heroicons/react/16/solid';
import { discoveryLandingConfig, type LandingConfig } from '@/lib/landing';

export function SeedForm({ config = discoveryLandingConfig }: { config?: LandingConfig }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(config.fields.map((field) => [field.key, ''])),
  );
  const [file, setFile] = useState<File | null>(null);
  const [fileText, setFileText] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const displayText = file ? fileText : textareaValue;
  const isEmpty = !file && textareaValue.trim().length === 0;

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      setError(null);
      setFile(selectedFile);

      const formData = new FormData();
      formData.append('file', selectedFile);

      try {
        setExtracting(true);
        const res = await fetch('/api/extract-text', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || 'Failed to extract text');
        }

        const { text } = await res.json();
        setFileText(text);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to extract text from file',
        );
        setFile(null);
      } finally {
        setExtracting(false);
      }
    },
    [],
  );

  function handleRemoveFile() {
    setFile(null);
    setFileText('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);

    if (isEmpty) {
      setError(config.validationMessage);
      return;
    }

    setError(null);
    setSubmitting(true);

    const formData = new FormData();
    for (const field of config.fields) {
      const value = fieldValues[field.key]?.trim();
      if (value) {
        formData.append(field.multipartName, value);
      }
    }
    if (file) {
      formData.append(config.contextFile.multipartName, file);
      if (fileText.trim()) {
        formData.append(config.contextText.multipartName, fileText.trim());
      }
    } else {
      formData.append(config.contextText.multipartName, textareaValue.trim());
    }

    try {
      const res = await fetch(config.endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create session');
      }

      router.push(`${config.sessionPath}/${data.sessionId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      );
      setSubmitting(false);
    }
  }

  const isBusy = extracting || submitting;

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full mx-auto grow"
      onDragOver={handleDragOver}
    >
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 h-full">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8 h-full">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-start gap-6 mb-8">
              <div className="lg:hidden w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/appato-logo.png"
                  alt="Appato Logo"
                  className="w-7 h-7 invert"
                />
              </div>

              <div className="flex flex-col items-start gap-1">
                <p className="lg:hidden text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                  Appato
                </p>
                <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100">
                  {config.formTitle}
                </h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-sm">
                  {config.formDescription}
                </p>
              </div>
            </div>

            {config.fields.map((field) => (
              <input
                key={field.key}
                type="text"
                value={fieldValues[field.key] || ''}
                onChange={(e) =>
                  setFieldValues((previous) => ({
                    ...previous,
                    [field.key]: e.target.value,
                  }))
                }
                placeholder={field.placeholder}
                aria-label={field.label}
                className="rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 px-4 py-2.5 text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isBusy}
              />
            ))}

            <div
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                isDragging
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-950'
                  : 'border-gray-300 dark:border-zinc-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept={config.contextFile.accept}
              />

              {extracting ? (
                <div className="flex flex-col items-center gap-3">
                  <ArrowPathIcon className="h-6 w-6 text-blue-600 animate-spin" />
                  <p className="text-sm text-gray-500 dark:text-zinc-400">
                    Extracting text from {file?.name}...
                  </p>
                </div>
              ) : file ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900 rounded-lg px-3 py-2 text-sm max-w-full">
                    <DocumentIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-gray-700 dark:text-zinc-300 truncate">
                      {file.name}
                    </span>
                    <span className="text-gray-400 dark:text-zinc-500 text-xs shrink-0">
                      ({Math.round(file.size / 1024)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    disabled={isBusy}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <CloudArrowUpIcon className="h-8 w-8 text-gray-400 dark:text-zinc-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-zinc-300">
                      Drag and drop a document
                    </p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
                      {config.contextFile.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isBusy}
                    className="rounded-lg border border-gray-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Browse files
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isBusy}
              className={`w-full rounded-xl px-6 py-3 text-white font-medium text-sm transition-colors ${
                isBusy
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gray-900 hover:bg-gray-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200'
              }`}
            >
              {submitting ? 'Creating session...' : config.submitLabel}
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <textarea
              value={displayText}
              onChange={(e) => {
                if (file) {
                  setFileText(e.target.value);
                } else {
                  setTextareaValue(e.target.value);
                }
              }}
              placeholder={config.contextText.placeholder}
              aria-label={`${config.agentTitle} starting context`}
              rows={10}
              className="w-full flex-1 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 px-4 py-3 text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[320px] font-mono"
              disabled={isBusy}
            />
            {file && (
              <p className="text-xs text-gray-400 dark:text-zinc-500 -mt-2">
                Text extracted from file — you can edit it before submitting
              </p>
            )}
          </div>
        </div>

        {error && touched && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 px-4 py-3 mt-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>
    </form>
  );
}
