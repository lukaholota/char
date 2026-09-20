'use client'

import { useEffect } from 'react'
import './globals.css'
import { WildMagicErrorScreen } from '@/components/errors/WildMagicErrorScreen'
import { reportBoundaryError } from '@/lib/monitoring/report-error'

// Ця межа підміняє кореневий layout разом із його стилями, тому globals.css імпортовано тут ще раз.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportBoundaryError(error)
  }, [error])

  return (
    <html lang="uk" className="h-full w-full dark">
      <body className="flex min-h-screen w-full items-center justify-center bg-slate-950 text-slate-200 antialiased">
        <WildMagicErrorScreen seed={error.digest} onRetry={reset} />
      </body>
    </html>
  )
}
