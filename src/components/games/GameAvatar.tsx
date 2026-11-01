import { PRIVATE_ELEMENT_CLASS } from "@/lib/monitoring/session-replay";
import { cn } from "@/lib/utils";

export function GameAvatar({ src, name, className }: { src: string | null; name: string; className?: string }) {
  if (!src) {
    return (
      <div className={cn("flex shrink-0 items-center justify-center rounded-full bg-white/10 font-rpg-display text-slate-200", className)} aria-hidden>
        {name.trim().charAt(0).toUpperCase()}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- Google-аватарки не з media-домену, next/image їх не пропустить
  return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className={cn("shrink-0 rounded-full object-cover", PRIVATE_ELEMENT_CLASS, className)} />;
}
