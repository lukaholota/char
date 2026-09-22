const SKELETON_CARD_COUNT = 6;

export function CharHomeSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Завантаження персонажів"
      className="container mx-auto py-8 px-4 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:pb-8"
    >
      <div className="flex flex-col gap-4 mb-8">
        <div className="h-3 w-32 rounded bg-white/10 animate-pulse" />
        <div className="h-10 w-full rounded-xl bg-white/5 border border-white/10 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
          <div key={index} className="h-40 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
