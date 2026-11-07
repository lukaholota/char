import { AlertTriangle } from "lucide-react";
import { AREA_SHAPE_LABELS } from "@/rules/game-areas";
import { findCreatureSaveAction, type CreatureSaveAction } from "@/rules/creature-area-action";
import { findCreatureRolls, type CreatureRoll } from "@/rules/creature-rolls";
import { attributesUkrShort } from "@/lib/refs/translation";

export const CREATURE_ACTION_TEMPLATES = [
  { label: "Атака", markdown: "**Укус.** Рукопашна атака: +5 до влучання, досяжність 5 фт., одна ціль. Влучання: 8 (1к10 + 3) колючої шкоди." },
  { label: "Подих по області", markdown: "**Вогняний подих (перезарядка 5–6).** Кожна істота в 15-футовому конусі здійснює ряткидок Спритності СК 13. При провалі вона зазнає 10 (3к6) вогняної шкоди, при успіху — половину цієї шкоди." },
  { label: "Ряткидок цілі", markdown: "**Жахливий погляд.** Одна істота, яку бачить у межах 30 фт., здійснює ряткидок Мудрості СК 12. При провалі вона зазнає 9 (2к8) психічної шкоди, при успіху — половину цієї шкоди." },
] as const;

type ActionCheck = { name: string; found: string[]; warning: string | null };

const SAVE_WORDS = /ряткидок|рятівн\p{L}*\s+кидок/iu;

export function CreatureActionsCheck({ markdown }: { markdown: string }) {
  const checks = splitActions(markdown).map(checkAction);
  if (checks.length === 0) return null;
  return (
    <section aria-label="Що кидатиметься в кімнаті" className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <h3 className="text-sm font-semibold text-slate-200">Що кидатиметься в кімнаті</h3>
      <ul className="space-y-2">
        {checks.map((check, index) => (
          <li key={index} className="text-sm leading-relaxed">
            <span className="font-semibold text-slate-100">{check.name}</span>
            {check.found.length > 0 ? <span className="text-amber-100"> — {check.found.join(" · ")}</span> : check.warning ? null : <span className="text-slate-500"> — без кубиків</span>}
            {check.warning ? (
              <span className="mt-0.5 flex gap-1.5 text-xs text-rose-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {check.warning}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function splitActions(markdown: string): string[] {
  return markdown
    .split(/\n\s*\n/)
    .map((block) => block.replace(/&nbsp;/g, " ").replace(/[*_\\]/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function checkAction(text: string): ActionCheck {
  const rolls = findCreatureRolls(text).map((spot) => spot.roll);
  const save = findCreatureSaveAction(text);
  const found = [...rolls.filter((roll) => roll.kind !== "damage").map(describeRoll), ...(save ? [describeSave(save)] : []), ...rolls.filter((roll) => roll.kind === "damage").map(describeRoll)];
  return { name: readActionName(text), found, warning: findSaveWarning(text, rolls, save) };
}

function readActionName(text: string): string {
  const name = text.split(/[.:]/)[0].replace(/\s*\([^)]*\)/g, "");
  return name.length <= 48 ? name : `${name.slice(0, 45)}…`;
}

function describeRoll(roll: CreatureRoll): string {
  if (roll.kind === "attack") return `атака ${roll.bonus >= 0 ? "+" : "−"}${Math.abs(roll.bonus)}`;
  if (roll.kind === "recharge") return `перезарядка ${roll.from === 6 ? "6" : `${roll.from}–6`}`;
  const bonus = roll.bonus === 0 ? "" : ` ${roll.bonus > 0 ? "+" : "−"} ${Math.abs(roll.bonus)}`;
  return `шкода ${roll.count}к${roll.sides}${bonus}`;
}

function describeSave(save: CreatureSaveAction): string {
  const target = save.area ? `${AREA_SHAPE_LABELS[save.area.shape].toLocaleLowerCase("uk")} ${save.area.sizeFeet} фт` : "обрана ціль";
  return `${target}: ряткидок ${attributesUkrShort[save.ability]} СК ${save.dc}${save.isHalfOnSave ? ", половина при успіху" : ""}`;
}

function findSaveWarning(text: string, rolls: CreatureRoll[], save: CreatureSaveAction | null): string | null {
  if (save || !SAVE_WORDS.test(text)) return null;
  if (!rolls.some((roll) => roll.kind === "damage")) return "Ряткидок без шкоди: ефект застосовує ведучий.";
  return "Ряткидок не кинеться сам: потрібні «ряткидок Мудрості СК 12» до шкоди, одна шкода кубиками й її тип після них, як у шаблоні.";
}
