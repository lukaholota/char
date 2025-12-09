import React from "react";

export const App = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="col-start-1 row-start-1 flex min-h-full w-full flex-col items-center px-0.5 md:py-6 md:col-start-2 md:px-6">
      { children }
    </main>
  )
}
