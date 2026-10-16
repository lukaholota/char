'use client'

import { startTransition, useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { CloudOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WildMagicErrorScreen } from '@/components/errors/WildMagicErrorScreen'
import { reportBoundaryError } from '@/lib/monitoring/report-error'
import { isOfflineActionError } from '@/lib/offline/action-guard'
import { isConnectionClosedError } from '@/lib/offline/connection-closed-error'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const isOfflineAction = isOfflineActionError(error)
  const isStaleAction = error.name === 'UnrecognizedActionError'
  const isConnectionClosed = isConnectionClosedError(error)

  useEffect(() => {
    if (isOfflineAction) {
      reset()
      return
    }
    if (isConnectionClosed && !navigator.onLine) return
    console.error(error)
    reportBoundaryError(error)
  }, [error, isOfflineAction, isConnectionClosed, reset])

  if (isOfflineAction) return <OfflineActionNotice reset={reset} />
  if (isStaleAction) return <StaleActionNotice />
  if (isConnectionClosed) return <ConnectionClosedNotice reset={reset} />

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

function ConnectionClosedNotice({ reset }: { reset: () => void }) {
  const router = useRouter()
  const retry = () =>
    startTransition(() => {
      router.refresh()
      reset()
    })

  return (
    <ConnectionNotice title="Звʼязок обірвався" actionLabel="Спробувати ще раз" onAction={retry}>
      Сторінка не довантажилася: відповідь сервера перервалася. Чернетка персонажа й правки в листі
      збережені на цьому пристрої — нічого не втрачено.
    </ConnectionNotice>
  )
}

function OfflineActionNotice({ reset }: { reset: () => void }) {
  return (
    <ConnectionNotice title="Немає мережі" actionLabel="Повернутися" onAction={reset}>
      Ця дія потребує звʼязку з сервером. Лист лишається на місці — правки хітів, комірок і
      нотаток збережуться офлайн і поїдуть самі.
    </ConnectionNotice>
  )
}

function ConnectionNotice({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string
  actionLabel: string
  onAction: () => void
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4 font-sans" role="alert">
      <Card className="w-full max-w-md bg-slate-900 border-amber-500/30 shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-xl font-bold text-amber-300">
            <CloudOff className="h-5 w-5" aria-hidden /> {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-slate-300">{children}</p>
          <div className="flex justify-center">
            <Button onClick={onAction} variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-200">
              {actionLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
