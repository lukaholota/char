const SKELETON_ROW_COUNT = 10;

export function SpellListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Завантаження заклинань" className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-6">
      <div className="mb-4 h-11 w-full animate-pulse rounded-xl border border-white/10 bg-white/5" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
          <div key={index} className="h-14 animate-pulse rounded-xl border border-white/10 bg-white/5" />
        ))}
      </div>
    </div>
  );
}
