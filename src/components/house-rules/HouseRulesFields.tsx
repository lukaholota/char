"use client";

import { SelectField } from "@/components/homebrew/HomebrewFormFields";
import { ATTUNEMENT_LIMIT_MAX, type MagicSystem, type SharedHouseRules } from "@/rules/house-rules";

export const MAGIC_SYSTEM_LABELS: Record<MagicSystem, string> = { SLOTS: "Комірки заклять", POINTS: "Очки чар (ДМГ)" };

const LIMIT_OPTIONS = Array.from({ length: ATTUNEMENT_LIMIT_MAX }, (_, index) => ({ value: String(index + 1), label: `${index + 1}` }));
const MAGIC_OPTIONS = Object.entries(MAGIC_SYSTEM_LABELS).map(([value, label]) => ({ value, label }));

type Props<Rules extends SharedHouseRules> = {
  rules: Rules;
  onChange: (rules: Rules) => void;
  defaultLimitLabel: string;
  defaultMagicLabel?: string;
};

export function HouseRulesFields<Rules extends SharedHouseRules>({ rules, onChange, defaultLimitLabel, defaultMagicLabel }: Props<Rules>) {
  const magicOptions = defaultMagicLabel ? [{ value: "", label: defaultMagicLabel }, ...MAGIC_OPTIONS] : MAGIC_OPTIONS;
  return (
    <div className="grid gap-3">
      <SelectField
        name="house-attunement-limit"
        label="Предметів із налаштуванням"
        value={rules.attunementLimit === null ? "" : String(rules.attunementLimit)}
        onChange={(value) => onChange({ ...rules, attunementLimit: value ? Number(value) : null })}
        options={[{ value: "", label: defaultLimitLabel }, ...LIMIT_OPTIONS]}
      />
      <SelectField
        name="house-magic-system"
        label="Магія"
        value={rules.magicSystem ?? (defaultMagicLabel ? "" : "SLOTS")}
        onChange={(value) => onChange({ ...rules, magicSystem: value ? (value as MagicSystem) : null })}
        options={magicOptions}
        hint={rules.magicSystem === "POINTS" ? "Замість комірок — запас очок: заклинання 1 кола коштує 2 очки, 9 кола — 13. Комірки договору лишаються." : undefined}
      />
    </div>
  );
}
