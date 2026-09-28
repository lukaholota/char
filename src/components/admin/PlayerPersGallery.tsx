import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { Badge } from "@/components/ui/badge";
import { FramedIllustration } from "@/components/ui/FramedIllustration";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { buildMediaImageUrl } from "@/lib/media-url";
import { buildPlayerGalleryHref, countPortraits, PLAYER_SORTS, type PlayerGalleryView, type PlayerPers, type PlayerSort, type PlayerWithPerses } from "@/lib/logic/admin-players";
import { cn } from "@/lib/utils";

const SORT_LABELS: Record<PlayerSort, string> = { recent: "Нещодавні", persCount: "Більше персонажів", portraitCount: "Більше портретів" };

const DATE_FORMAT = new Intl.DateTimeFormat("uk-UA", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Europe/Kyiv" });

type GalleryProps = { players: PlayerWithPerses[]; totalPlayerCount: number; view: PlayerGalleryView };

export function PlayerPersGallery({ players, totalPlayerCount, view }: GalleryProps) {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 pb-28 pt-6">
      <GallerySummary players={players} totalPlayerCount={totalPlayerCount} />
      <GalleryControls view={view} />
      {players.map((player) => (
        <PlayerSection key={player.userId} player={player} />
      ))}
    </main>
  );
}

function GallerySummary({ players, totalPlayerCount }: { players: PlayerWithPerses[]; totalPlayerCount: number }) {
  const persCount = players.reduce((sum, player) => sum + player.perses.length, 0);
  const portraitCount = players.reduce((sum, player) => sum + countPortraits(player), 0);
  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-semibold text-slate-100">Гравці та персонажі</h1>
      <p className="text-sm text-slate-400">
        {players.length} з {totalPlayerCount} гравців · {persCount} персонажів · {portraitCount} з портретом
      </p>
    </header>
  );
}

function GalleryControls({ view }: { view: PlayerGalleryView }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <GalleryLink href={buildPlayerGalleryHref({ ...view, onlyWithPortraits: !view.onlyWithPortraits })} isActive={view.onlyWithPortraits}>
        <span className={cn("flex h-4 w-4 items-center justify-center rounded border", view.onlyWithPortraits ? "border-arcane-300 bg-arcane-300/20" : "border-slate-500")}>
          {view.onlyWithPortraits ? <Check className="h-3 w-3" /> : null}
        </span>
        Лише з портретами
      </GalleryLink>
      <span className="mx-1 h-5 w-px bg-white/10" />
      {PLAYER_SORTS.map((sort) => (
        <GalleryLink key={sort} href={buildPlayerGalleryHref({ ...view, sort })} isActive={view.sort === sort}>
          {SORT_LABELS[sort]}
        </GalleryLink>
      ))}
    </div>
  );
}

function GalleryLink({ href, isActive, children }: { href: string; isActive: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      replace
      scroll={false}
      className={cn("inline-flex items-center gap-2 rounded-lg border px-3 py-1.5", isActive ? "border-arcane-300/50 bg-arcane-300/10 text-slate-100" : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10")}
    >
      {children}
    </Link>
  );
}

function PlayerSection({ player }: { player: PlayerWithPerses }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3 border-b border-white/10 pb-2">
        <PlayerAvatar player={player} />
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-100">{player.name}</div>
          <div className="truncate text-xs text-slate-500">{player.email}</div>
          <div className="truncate text-xs text-slate-500">
            {player.perses.length} персонажів · {countPortraits(player)} з портретом · востаннє {DATE_FORMAT.format(player.lastActivityAt)}
          </div>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {player.perses.map((pers) => (
          <PersTile key={pers.persId} pers={pers} />
        ))}
      </ul>
    </section>
  );
}

function PlayerAvatar({ player }: { player: PlayerWithPerses }) {
  if (!player.avatarUrl) {
    return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-300">{player.name.charAt(0)}</div>;
  }
  // eslint-disable-next-line @next/next/no-img-element -- Google-аватарки не з media-домену, next/image їх не пропустить
  return <img src={player.avatarUrl} alt="" width={40} height={40} referrerPolicy="no-referrer" className="h-10 w-10 shrink-0 rounded-full object-cover" />;
}

function PersTile({ pers }: { pers: PlayerPers }) {
  return (
    <li className="space-y-1.5">
      <div className="aspect-square w-full">
        {pers.portraitKey ? (
          <FramedIllustration src={buildMediaImageUrl(pers.portraitKey, "full")} alt={`Портрет: ${pers.name}`} provenance="drawn" sizes="(min-width: 1024px) 180px, 45vw" chamfer="sm" vignette="sm" />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-md border border-white/10 bg-white/5 text-3xl text-slate-600">{pers.name.charAt(0)}</div>
        )}
      </div>
      <div className="flex items-start gap-1.5">
        <span className="line-clamp-2 min-w-0 break-words text-sm font-medium text-slate-100">{pers.name}</span>
        {pers.ruleset === "RULES_2024" ? (
          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 px-1 py-0 text-[10px] font-normal text-amber-300">
            2024
          </Badge>
        ) : null}
      </div>
      <div className="text-xs text-slate-400">
        {translateValue(pers.raceName)} {translateValue(pers.className)} {pers.level}
      </div>
      <div className="text-[11px] text-slate-600">{DATE_FORMAT.format(pers.updatedAt)}</div>
    </li>
  );
}
