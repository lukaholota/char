"use client";

import { useEffect, useState } from "react";

const SLOW_CREATION_NOTICE_MS = 8_000;

export function ReadyPresetCreationProgress({ levelCount }: { levelCount: number }) {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsSlow(true), SLOW_CREATION_NOTICE_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div role="status" className="mb-4 rounded-xl bg-white/5 p-4">
      <p className="text-sm text-slate-200">{levelCount > 1 ? `Збираємо персонажа: ${levelCount} рівнів` : "Створюємо персонажа"}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-full animate-pulse rounded-full bg-arcane-400 motion-reduce:animate-none" />
      </div>
      {isSlow ? <p className="mt-3 text-sm text-slate-400">Це триває довше, ніж зазвичай. Не закривайте сторінку: персонаж створиться повністю або не створиться зовсім.</p> : null}
    </div>
  );
}
