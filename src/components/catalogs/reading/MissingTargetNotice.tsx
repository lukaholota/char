"use client";

export function MissingTargetNotice({ message, actionLabel, onAction }: { message: string; actionLabel: string; onAction: () => void }) {
  return (
    <div role="status" className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">
      <span className="min-w-0 flex-1">{message}</span>
      <button type="button" onClick={onAction} className="min-h-10 rounded-lg border border-white/10 px-3 text-xs text-slate-100 hover:bg-white/5">
        {actionLabel}
      </button>
    </div>
  );
}
