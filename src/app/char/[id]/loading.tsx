export default function Loading() {
  return (
    <div className="h-screen w-full bg-slate-900 flex flex-col">
      <div className="p-3 px-4 border-b border-white/10 flex justify-between items-center bg-slate-900/70 backdrop-blur sticky top-0 z-20">
        <div className="space-y-2">
          <div className="h-5 w-48 rounded bg-white/10 animate-pulse" />
          <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-3 md:p-4">
          <div className="h-full rounded-xl bg-white/5 border border-white/10 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
