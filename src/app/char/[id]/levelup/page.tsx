import { notFound } from "next/navigation";
import { Suspense } from "react";
import LevelUpData from "@/app/char/[id]/levelup/wizard-data";
import { NetworkRequiredNotice } from "@/components/ui/NetworkRequiredNotice";

function LevelUpFallback() {
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

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (isNaN(id)) notFound();

  return (
    <>
      <NetworkRequiredNotice action="Підняття рівня" />
      <Suspense fallback={<LevelUpFallback />}>
        <LevelUpData id={id} />
      </Suspense>
    </>
  );
}
