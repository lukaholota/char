import React from "react";

export const App = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-1 flex-col items-center md:ml-[35] pb-20 md:pb-0">
      { children }
    </div>
  )
}