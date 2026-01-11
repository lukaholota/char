'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4 font-sans">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-red-400 text-center">Сталася помилка (500)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-slate-300 text-center text-lg leading-relaxed">
            напишіть в тг <a href="https://t.me/LukaHolota" className="text-blue-400 hover:underline font-bold">@LukaHolota</a> що він дебіл і в нього ліг сайт
          </p>
          <div className="flex justify-center pt-2">
            <Button 
              onClick={() => reset()}
              variant="outline"
              className="border-slate-700 hover:bg-slate-800 text-slate-200"
            >
              Спробувати ще раз
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
