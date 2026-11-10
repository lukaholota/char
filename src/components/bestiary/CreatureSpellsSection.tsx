"use client";

import { Dice6 } from "lucide-react";
import { SpellAnchor } from "@/components/ui/SpellAnchor";
import { D20Icon } from "@/lib/components/icons/D20Icon";
import { ABILITY_GENITIVE, buildCreatureSpellRollContext, describeTargetSave } from "@/lib/components/dice/roll-contexts";
import { openRoomRoll } from "@/lib/components/game/open-room-roll";
import { formatModifier } from "@/lib/logic/utils";
import { buildSpellSlug } from "@/lib/spell-link";
import { cn } from "@/lib/utils";
import { describeCreatureSpellLevel, type CreatureSpell, type CreatureSpellcasting } from "@/rules/creature-spellcasting";

const SPELL_ATTACK_KEY = "spell-attack";

export function CreatureSpellsSection({ spellcasting, creatureName, titleClassName }: { spellcasting: CreatureSpellcasting; creatureName: string; titleClassName: string }) {
  return (
    <div className="mt-4 space-y-1.5">
      <div className={cn("text-xs font-semibold uppercase tracking-wider", titleClassName)}>Заклинання</div>
      <div className="glass-panel space-y-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-300 sm:text-sm">
        <p>
          Бонус атаки <span className="font-semibold text-slate-100">{formatModifier(spellcasting.attackBonus)}</span>, СК ряткидка{" "}
          <span className="font-semibold text-slate-100">{spellcasting.saveDc}</span>
        </p>
        {groupSpellsByLevel(spellcasting.spells).map(([level, spells]) => (
          <section key={level} className="space-y-1">
            <h4 className="font-semibold text-slate-400">{describeCreatureSpellLevel(level)}</h4>
            <ul className="divide-y divide-white/5">
              {spells.map((spell) => (
                <CreatureSpellRow key={spell.spellId} spell={spell} spellcasting={spellcasting} creatureName={creatureName} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function CreatureSpellRow({ spell, spellcasting, creatureName }: { spell: CreatureSpell; spellcasting: CreatureSpellcasting; creatureName: string }) {
  const { plan } = spell;
  const openRoll = (pressedKey: string) => {
    if (!plan) return;
    openRoomRoll(
      buildCreatureSpellRollContext({
        creatureName,
        spellName: spell.name,
        plan,
        attackBonus: spellcasting.attackBonus,
        saveDC: spellcasting.saveDc,
        spell: { engName: spell.engName, level: spell.level, ruleset: spellcasting.ruleset },
        pressedKey,
      }),
    );
  };
  const damageRolls = plan?.rolls.filter((roll) => roll.count > 0) ?? [];
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1.5">
      <span className="min-w-0">
        <SpellAnchor spellLink={{ spellKey: buildSpellSlug(spell.engName), ruleset: spellcasting.ruleset }}>{spell.name}</SpellAnchor>
        {plan?.save ? <span className="ml-2 text-slate-400">{describeTargetSave({ abilityName: ABILITY_GENITIVE[plan.save], dc: spellcasting.saveDc })}</span> : null}
      </span>
      <span className="flex flex-wrap gap-1">
        {plan?.attack ? (
          <SpellRollChip isD20 label={`Атака: ${spell.name}`} onRoll={() => openRoll(SPELL_ATTACK_KEY)}>
            Атака {formatModifier(spellcasting.attackBonus)}
          </SpellRollChip>
        ) : null}
        {damageRolls.map((roll) => (
          <SpellRollChip key={roll.key} label={`${roll.label} ${roll.count}к${roll.sides}: ${spell.name}`} onRoll={() => openRoll(roll.key)}>
            {roll.label} {roll.count}к{roll.sides}
            {roll.bonus ? ` ${roll.bonus > 0 ? "+" : "−"} ${Math.abs(roll.bonus)}` : ""}
          </SpellRollChip>
        ))}
      </span>
    </li>
  );
}

function SpellRollChip({ isD20 = false, label, onRoll, children }: { isD20?: boolean; label: string; onRoll: () => void; children: React.ReactNode }) {
  const Icon = isD20 ? D20Icon : Dice6;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onRoll}
      className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 font-semibold text-amber-100 hover:border-amber-300/60 hover:bg-amber-500/20"
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
      {children}
    </button>
  );
}

function groupSpellsByLevel(spells: readonly CreatureSpell[]): Array<[number, CreatureSpell[]]> {
  const groups = new Map<number, CreatureSpell[]>();
  for (const spell of spells) groups.set(spell.level, [...(groups.get(spell.level) ?? []), spell]);
  return [...groups.entries()].sort(([a], [b]) => a - b);
}
