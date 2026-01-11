'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="uk" className="dark">
      <body className="bg-slate-950 text-slate-200 min-h-screen flex items-center justify-center p-4 antialiased">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-lg shadow-2xl text-center space-y-6">
          <h1 className="text-3xl font-bold text-red-500">Критична помилка (500)</h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            напишіть в тг <a href="https://t.me/LukaHolota" className="text-blue-400 hover:underline font-bold">@LukaHolota</a> що він дебіл і в нього ліг сайт
          </p>
          <div className="pt-2">
            <button
              onClick={() => reset()}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors text-slate-200"
            >
              Спробувати ще раз
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
