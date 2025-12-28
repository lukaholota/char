import React from "react";

export const App = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="col-start-1 row-start-1 flex min-h-full w-full flex-col items-center md:col-start-2">
      { children }
    </main>
  )
}
