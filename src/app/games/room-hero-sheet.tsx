import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { loadSheetProps, PinnedCharacterSheet } from "@/app/char/[id]/sheet-data";

export async function RoomHeroSheet({ persId }: { persId: number }) {
  const sheet = await loadSheetProps(persId).catch((error: unknown) => {
    console.warn("game room hero sheet failed", error instanceof Error ? error.name : "unknown");
    return null;
  });
  if (!sheet) {
    return (
      <p className="m-4 rounded-xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300">
        Лист не вдалося показати тут. <Link href={`/char/${persId}`} className="underline">Відкрити лист окремо</Link>
      </p>
    );
  }
  return <PinnedCharacterSheet sheet={sheet} isEmbedded />;
}

export function RoomHeroSheetSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3 p-3" aria-hidden>
      <div className="h-14 rounded-xl bg-white/5" />
      <div className="flex-1 rounded-xl border border-white/10 bg-white/5" />
    </div>
  );
}
