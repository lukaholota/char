'use client'

import { useEffect } from 'react'
import { CloudOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WildMagicErrorScreen } from '@/components/errors/WildMagicErrorScreen'
import { reportBoundaryError } from '@/lib/monitoring/report-error'
import { isOfflineActionError } from '@/lib/offline/action-guard'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const isOfflineAction = isOfflineActionError(error)
  const isStaleAction = error.name === 'UnrecognizedActionError'

  useEffect(() => {
    if (isOfflineAction) {
      reset()
      return
    }
    console.error(error)
    reportBoundaryError(error)
  }, [error, isOfflineAction, reset])

  if (isOfflineAction) return <OfflineActionNotice reset={reset} />
  if (isStaleAction) return <StaleActionNotice />

  return <WildMagicErrorScreen seed={error.digest} onRetry={reset} />
}

function StaleActionNotice() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4 font-sans" role="alert">
      <Card className="w-full max-w-md border-amber-500/30 bg-slate-900 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-center text-xl font-bold text-amber-300">Сайт оновився</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-slate-300">Ця вкладка відкрита зі старою версією. Оновіть сторінку й повторіть дію.</p>
          <Button onClick={() => window.location.reload()}>Оновити сторінку</Button>
        </CardContent>
      </Card>
    </div>
  )
}

function OfflineActionNotice({ reset }: { reset: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4 font-sans" role="alert">
      <Card className="w-full max-w-md bg-slate-900 border-amber-500/30 shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-xl font-bold text-amber-300">
            <CloudOff className="h-5 w-5" /> Немає мережі
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-slate-300">
            Ця дія потребує звʼязку з сервером. Лист лишається на місці — правки хітів, комірок і
            нотаток збережуться офлайн і поїдуть самі.
          </p>
          <div className="flex justify-center">
            <Button onClick={() => reset()} variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-200">
              Повернутися
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
