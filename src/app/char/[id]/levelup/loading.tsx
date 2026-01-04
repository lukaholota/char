export default function Loading() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="space-y-4">
        <div className="glass-panel border-gradient-rpg w-full rounded-2xl px-3 py-4 sm:px-4 sm:py-4 md:px-6 md:py-5">
          <div className="space-y-2">
            <div className="h-7 w-64 rounded bg-white/10 animate-pulse" />
            <div className="h-4 w-40 rounded bg-white/10 animate-pulse" />
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 h-[60vh] animate-pulse" />
      </div>
    </div>
  );
}
