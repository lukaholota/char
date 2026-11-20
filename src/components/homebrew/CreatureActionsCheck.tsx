import { AlertTriangle } from "lucide-react";
import { AREA_SHAPE_LABELS } from "@/rules/game-areas";
import { findCreatureSaveAction, findCreatureSaveEffect, type CreatureSaveAction, type CreatureSaveEffect } from "@/rules/creature-area-action";
import { TOKEN_CONDITION_LABELS } from "@/rules/token-conditions";
import { findCreatureRolls, type CreatureRoll } from "@/rules/creature-rolls";
import { pluralizeCharges } from "@/rules/magic-item-charge-text";
import { findItemActionChargeCost, findItemRolls } from "@/rules/magic-item-action-rolls";
import { attributesUkrShort } from "@/lib/refs/translation";

export const CREATURE_ACTION_TEMPLATES = [
  { label: "Атака", markdown: "**Укус.** Рукопашна атака: +5 до влучання, досяжність 5 фт., одна ціль. Влучання: 8 (1к10 + 3) колючої шкоди." },
  { label: "Подих по області", markdown: "**Вогняний подих (перезарядка 5–6).** Кожна істота в 15-футовому конусі здійснює ряткидок Спритності СК 13. При провалі вона зазнає 10 (3к6) вогняної шкоди, при успіху — половину цієї шкоди." },
  { label: "Ряткидок цілі", markdown: "**Жахливий погляд.** Одна істота, яку бачить у межах 30 фт., здійснює ряткидок Мудрості СК 12. При провалі вона зазнає 9 (2к8) психічної шкоди, при успіху — половину цієї шкоди." },
] as const;

export const ITEM_ACTION_TEMPLATES = [
  { label: "Заряди", markdown: "Предмет має 7 зарядів. Він відновлює 1к6 + 1 витрачених зарядів щодня на світанку." },
  { label: "Промінь у ціль", markdown: "**Промінь знищення (витрачає 1 заряд).** Дією ви спрямовуєте предмет на істоту в межах 60 фт. Дистанційна атака заклинанням: +7 до влучання. Влучання: 4к10 некротичної шкоди." },
  { label: "Вибух по області", markdown: "**Вогняна хвиля (витрачає 2 заряди).** Кожна істота в 20-футовій сфері здійснює ряткидок Спритності СК 15. При провалі вона зазнає 6к6 вогняної шкоди, при успіху — половину цієї шкоди." },
  { label: "Лікування", markdown: "**Цілющий дотик (витрачає 1 заряд).** Дією ви торкаєтеся істоти, і вона відновлює 2к8 + 2 хітів." },
] as const;

type ActionCheck = { name: string; found: string[]; warning: string | null };

const SAVE_WORDS = /ряткидок|рятівн\p{L}*\s+кидок/iu;

/// isItem — опис предмета: абзаци без кубиків — звичайний опис, тож у перевірку потрапляють лише дії з кидками.
export function CreatureActionsCheck({ markdown, isItem = false }: { markdown: string; isItem?: boolean }) {
  const checks = splitActions(markdown).map((text) => (isItem ? checkItemAction(text) : checkAction(text))).filter((check) => !isItem || check.found.length > 0);
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
    .split(/\n\s*\n|\n(?=\s*(?:\d+[.)]|[-*+])\s)/)
    .map((block) => block.replace(/^\s*(?:\d+[.)]|[-*+])\s+/, "").replace(/&nbsp;/g, " ").replace(/[*_\\]/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function checkItemAction(text: string): ActionCheck {
  const check = checkAction(text, findItemRolls);
  const cost = check.found.length ? findItemActionChargeCost(text) : null;
  return cost ? { ...check, found: [`витрачає ${cost} ${pluralizeCharges(cost)}`, ...check.found] } : check;
}

function checkAction(text: string, findRolls = findCreatureRolls): ActionCheck {
  const rolls = findRolls(text).map((spot) => spot.roll);
  const save = findCreatureSaveAction(text);
  const saveEffect = findCreatureSaveEffect(text);
  const saves = save ? [describeSave(save)] : saveEffect ? [describeSaveEffect(saveEffect)] : [];
  const found = [...rolls.filter((roll) => roll.kind !== "damage").map(describeRoll), ...saves, ...rolls.filter((roll) => roll.kind === "damage").map(describeRoll)];
  return { name: readActionName(text), found, warning: saveEffect ? null : findSaveWarning(text, rolls, save) };
}

function readActionName(text: string): string {
  const name = text.split(/[.:]/)[0].replace(/\s*\([^)]*\)/g, "");
  return name.length <= 48 ? name : `${name.slice(0, 45)}…`;
}

function describeRoll(roll: CreatureRoll): string {
  if (roll.kind === "attack") return `атака ${roll.bonus >= 0 ? "+" : "−"}${Math.abs(roll.bonus)}`;
  if (roll.kind === "save") return `ряткидок ${attributesUkrShort[roll.ability]} СК ${roll.dc}`;
  if (roll.kind === "recharge") return `перезарядка ${roll.from === 6 ? "6" : `${roll.from}–6`}`;
  if (roll.kind === "dice") return `кидок ${roll.count > 1 ? roll.count : ""}к${roll.sides}`;
  const bonus = roll.bonus === 0 ? "" : ` ${roll.bonus > 0 ? "+" : "−"} ${Math.abs(roll.bonus)}`;
  return `${roll.kind === "heal" ? "лікування" : "шкода"} ${roll.count}к${roll.sides}${bonus}`;
}

function describeSave(save: CreatureSaveAction): string {
  return `${describeSaveTarget(save.area)}: ряткидок ${attributesUkrShort[save.ability]} СК ${save.dc}${save.isHalfOnSave ? ", половина при успіху" : ""}`;
}

function describeSaveEffect(save: CreatureSaveEffect): string {
  const effect = save.condition ? `при провалі стан «${TOKEN_CONDITION_LABELS[save.condition]}»` : "ефект застосовує ведучий";
  return `${describeSaveTarget(save.area)}: ряткидок ${attributesUkrShort[save.ability]} СК ${save.dc}, ${effect}`;
}

function describeSaveTarget(area: CreatureSaveAction["area"]): string {
  return area ? `${AREA_SHAPE_LABELS[area.shape].toLocaleLowerCase("uk")} ${area.sizeFeet} фт` : "обрана ціль";
}

function findSaveWarning(text: string, rolls: CreatureRoll[], save: CreatureSaveAction | null): string | null {
  if (save || !SAVE_WORDS.test(text)) return null;
  if (!rolls.some((roll) => roll.kind === "damage")) return "Ряткидок без шкоди: ефект застосовує ведучий.";
  return "Ряткидок не кинеться сам: потрібні «ряткидок Мудрості СК 12» до шкоди, одна шкода кубиками й її тип після них, як у шаблоні.";
}
