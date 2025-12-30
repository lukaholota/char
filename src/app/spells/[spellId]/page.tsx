import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllSpells, getSpellById, type SpellData } from "@/lib/spellsData";
import { spellSchoolTranslations, sourceTranslations } from "@/lib/refs/translation";
import { FormattedDescription } from "@/components/ui/FormattedDescription";

// Generate all spell pages at build time
export async function generateStaticParams() {
  const spells = getAllSpells();
  return spells.map((spell) => ({
    spellId: String(spell.spellId),
  }));
}

// Generate SEO metadata for each spell
export async function generateMetadata({
  params,
}: {
  params: Promise<{ spellId: string }>;
}): Promise<Metadata> {
  const { spellId } = await params;
  const spell = getSpellById(Number(spellId));

  if (!spell) {
    return {
      title: "Заклинання не знайдено",
    };
  }

  const schoolLabel = spell.school
    ? spellSchoolTranslations[spell.school as keyof typeof spellSchoolTranslations] || spell.school
    : "";
  const levelLabel = spell.level === 0 ? "Замовляння" : `${spell.level} рівень`;

  return {
    title: `${spell.name} — ${levelLabel}`,
    description: `${spell.name} — ${schoolLabel} ${levelLabel}. ${spell.description.slice(0, 150)}...`,
    openGraph: {
      title: spell.name,
      description: `${levelLabel} • ${schoolLabel}`,
    },
  };
}

// Helper functions
function normalizeFlag(value: string | null | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return false;
  return v === "так" || v === "yes" || v === "true" || v === "1";
}

function levelLabel(level: number, isRitual: boolean) {
  const base = level === 0 ? "Замовляння" : `Рівень ${level}`;
  return isRitual ? `${base} (ритуал)` : base;
}

function schoolLabel(school: string | null) {
  if (!school) return "";
  return spellSchoolTranslations[school as keyof typeof spellSchoolTranslations] || school;
}

function sourceLabel(source: string) {
  return sourceTranslations[source as keyof typeof sourceTranslations] || source;
}

// Spell detail component (shared with overlay)
function SpellDetailCard({ spell }: { spell: SpellData }) {
  const classList = Array.from(
    new Set(spell.spellClasses.map((c) => c.className).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "uk"));

  const raceList = Array.from(
    new Set(spell.spellRaces.map((r) => r.raceName || "").filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "uk"));

  return (
    <div className="glass-card border border-white/10 bg-slate-950/60 p-3 shadow-[0_0_30px_rgba(45,212,191,0.08)] ring-1 ring-white/10 backdrop-blur-xl sm:p-6 break-words max-w-full overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <h1 className="flex-1 min-w-0 font-sans text-base sm:text-xl font-semibold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-violet-400 truncate">
          {spell.name}
        </h1>
        <div className="text-sm font-mono text-slate-500 hidden sm:block shrink-0">[{spell.engName}]</div>
      </div>
      <div className="text-xs font-mono text-slate-500 sm:hidden mt-0.5 mb-2">{spell.engName}</div>

      <div className="mt-2 rounded-xl bg-white/5 p-2 glass-panel border border-white/10">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
            <span className="text-slate-300">{levelLabel(spell.level, normalizeFlag(spell.hasRitual))}</span>
            <span className="italic text-slate-300">{schoolLabel(spell.school)}</span>
          </div>

          <div className="min-w-0 max-w-[40%] flex-shrink text-right text-[10px] sm:text-xs text-slate-400 truncate">
            {sourceLabel(spell.source)}
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-3">
        <div className="rounded-xl bg-slate-900/40 border border-white/5 p-2 sm:p-3 glass-panel">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400">Час використання</div>
          <div className="mt-0.5 text-[11px] sm:text-sm text-slate-200">{spell.castingTime || "—"}</div>
        </div>
        <div className="rounded-xl bg-slate-900/40 border border-white/5 p-2 sm:p-3 glass-panel">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400">Тривалість</div>
          <div className="mt-0.5 text-[11px] sm:text-sm text-slate-200">{spell.duration || "—"}</div>
        </div>
        <div className="rounded-xl bg-slate-900/40 border border-white/5 p-2 sm:p-3 glass-panel">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400">Дистанція</div>
          <div className="mt-0.5 text-[11px] sm:text-sm text-slate-200">{spell.range || "—"}</div>
        </div>
        <div className="rounded-xl bg-slate-900/40 border border-white/5 p-2 sm:p-3 glass-panel">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400">Компоненти</div>
          <div className="mt-0.5 text-[11px] sm:text-sm text-slate-200">{spell.components || "—"}</div>
        </div>
      </div>

      <div className="mt-3 glass-panel rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4 max-w-full overflow-hidden">
        <FormattedDescription content={spell.description} className="text-slate-300 text-xs sm:text-base break-words" />
      </div>

      <div className="mt-3 border-t border-slate-800/70 pt-3 text-[11px] sm:text-sm text-slate-300">
        <div>
          <span className="text-slate-400">Класи:</span> {classList.length ? classList.join(", ") : "—"}
        </div>
        {raceList.length > 0 && (
          <div className="mt-1">
            <span className="text-slate-400">Раси:</span> {raceList.join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}

// Main page component
export default async function SpellDetailPage({
  params,
}: {
  params: Promise<{ spellId: string }>;
}) {
  const { spellId } = await params;
  const spell = getSpellById(Number(spellId));

  if (!spell) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,0.05),transparent_50%)] overflow-x-hidden">
      {/* Header with back button */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/20 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <a
            href="/spells"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад до заклинань
          </a>
        </div>
      </div>
      
      <div className="mx-auto max-w-2xl px-4 py-6">
        <SpellDetailCard spell={spell} />
      </div>
    </div>
  );
}
