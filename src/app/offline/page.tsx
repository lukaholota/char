import { ModeLink } from "@/components/no-ai/ModeLink";

export const metadata = { title: "Немає мережі" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-slate-50">Ця сторінка ще не збережена</h1>
      <p className="max-w-md text-sm text-slate-300/80">
        Зараз немає мережі, а ця сторінка ще не збережена на цьому пристрої. Персонажі, відкриті тут
        раніше, доступні офлайн — правки в них не загубляться і поїдуть на сервер, щойно зʼявиться
        звʼязок.
      </p>
      <ModeLink href="/char/home" className="text-sm font-semibold text-indigo-300 underline underline-offset-4">
        До моїх персонажів
      </ModeLink>
    </div>
  );
}
