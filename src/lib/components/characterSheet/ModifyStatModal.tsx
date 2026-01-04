"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Ability, Skills, SkillProficiencyType } from "@prisma/client";
import { PersWithRelations } from "@/lib/actions/pers";
import { updateBonus, updateSkillProficiency, updateSaveProficiency, updateBaseStat, updateBaseACOverride } from "@/lib/actions/bonus-actions";
import { bonusTranslations, skillTranslations } from "@/lib/refs/translation";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  getStatBonus,
  getModifierBonus,
  getSaveBonus,
  getSkillBonus,
  getSimpleBonus,
  calculateFinalStat,
  calculateFinalAC,
  calculateFinalInitiative,
  calculateFinalProficiency,
  calculateSpellAttack,
  calculateSpellDC,
} from "@/lib/logic/bonus-calculator";
import { getAbilityMod, getProficiencyBonus } from "@/lib/logic/utils";
import { Minus, Plus } from "lucide-react";
import { SimpleBonusField } from "@/lib/types/model-types";

// ============================================================================
// Types
// ============================================================================

export type ModifyConfig =
  | { type: "stat"; ability: Ability }
  | { type: "skill"; skill: Skills }
  | { type: "simple"; field: SimpleBonusField };

interface ModifyStatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pers: PersWithRelations;
  onPersUpdate: (next: PersWithRelations) => void;
  config: ModifyConfig | null;
}

// ============================================================================
// Component
// ============================================================================

export default function ModifyStatModal({
  open,
  onOpenChange,
  pers,
  onPersUpdate,
  config,
}: ModifyStatModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statMode, setStatMode] = useState<"BONUS" | "BASE">("BONUS");
  const [baseStatInput, setBaseStatInput] = useState<string>("");
  const [baseACInput, setBaseACInput] = useState<string>("");
  
  // Local bonus states for immediate feedback
  const [localStatBonus, setLocalStatBonus] = useState(0);
  const [localModifierBonus, setLocalModifierBonus] = useState(0);
  const [localSaveBonus, setLocalSaveBonus] = useState(0);
  const [localSkillBonus, setLocalSkillBonus] = useState(0);
  const [localSimpleBonus, setLocalSimpleBonus] = useState(0);
  const [localProficiency, setLocalProficiency] = useState<SkillProficiencyType>("NONE");
  // Custom save proficiency (stored in Pers.additionalSaveProficiencies)
  const [localSaveProficiency, setLocalSaveProficiency] = useState(false);
  
  // Initialize local state when modal opens
  const initializeState = useCallback(() => {
    if (!config) return;
    
    if (config.type === "stat") {
      setStatMode("BONUS");
      setLocalStatBonus(getStatBonus(pers, config.ability));
      setLocalModifierBonus(getModifierBonus(pers, config.ability));
      setLocalSaveBonus(getSaveBonus(pers, config.ability));

      const baseStatMap: Record<Ability, number> = {
        STR: pers.str,
        DEX: pers.dex,
        CON: pers.con,
        INT: pers.int,
        WIS: pers.wis,
        CHA: pers.cha,
      };
      const baseStat = baseStatMap[config.ability];
      setBaseStatInput(String(baseStat));
      
      const additionalSaves = (pers as any).additionalSaveProficiencies as Ability[] ?? [];
      // The toggle controls only custom proficiency; base (class) proficiency can't be disabled here.
      // If the character is already proficient from class, we still show proficiency in preview via class saves.
      setLocalSaveProficiency(additionalSaves.includes(config.ability));
    } else if (config.type === "skill") {
      setLocalSkillBonus(getSkillBonus(pers, config.skill));
      const persSkill = pers.skills.find((ps) => ps.name === config.skill);
      setLocalProficiency(persSkill?.proficiencyType ?? "NONE");
    } else if (config.type === "simple") {
      setLocalSimpleBonus(getSimpleBonus(pers, config.field));

      if (config.field === "ac") {
        setStatMode("BONUS");
        const current = pers.overrideBaseAC;
        setBaseACInput(typeof current === "number" && Number.isFinite(current) ? String(current) : "");
      }
    }
  }, [config, pers]);
  
  // Initialize when modal opens
  useMemo(() => {
    if (open) {
      initializeState();
    }
  }, [open, initializeState]);

  // Get title based on config
  const title = useMemo(() => {
    if (!config) return "";
    
    if (config.type === "stat") {
      const statName = bonusTranslations.statNames[config.ability as keyof typeof bonusTranslations.statNames];
      return `${bonusTranslations.modifyTitle}: ${statName}`;
    } else if (config.type === "skill") {
      const skillName = skillTranslations[config.skill] ?? config.skill;
      return `${bonusTranslations.modifyTitle}: ${skillName}`;
    } else {
      const fieldName = bonusTranslations.fieldNames[config.field as keyof typeof bonusTranslations.fieldNames];
      return `${bonusTranslations.modifyTitle}: ${fieldName}`;
    }
  }, [config]);

  const statBase = useMemo(() => {
    if (!config || config.type !== "stat") return null;
    const ability = config.ability;
    const baseStatMap: Record<Ability, number> = {
      STR: pers.str,
      DEX: pers.dex,
      CON: pers.con,
      INT: pers.int,
      WIS: pers.wis,
      CHA: pers.cha,
    };
    return { ability, base: baseStatMap[ability] };
  }, [config, pers]);

  useEffect(() => {
    // Determine title only, logic moved to initializeState and render
  }, [config]);

  // Calculate preview values
  const previewValues = useMemo(() => {
    if (!config) return null;
    
    if (config.type === "stat") {
      const dbBaseStat = statBase?.base ?? 10;

      // In BASE mode, we use the input. In BONUS mode, we still use the input (it holds the current base).
      // If the user hasn't touched the input, it was initialized to dbBaseStat.
      const baseInputRaw = Number(baseStatInput);
      const effectiveBase = Number.isFinite(baseInputRaw) ? Math.trunc(baseInputRaw) : dbBaseStat;
      
      const finalStat = effectiveBase + localStatBonus;
      const baseMod = getAbilityMod(finalStat);
      const finalMod = baseMod + localModifierBonus;
      
      // Proficiency is controlled solely via Pers.additionalSaveProficiencies
      const effectiveIsProficient = localSaveProficiency;
      
      const pb = calculateFinalProficiency(pers);
      const baseSave = finalMod + (effectiveIsProficient ? pb : 0);
      const finalSave = baseSave + localSaveBonus;
      
      return {
        stat: { base: effectiveBase, bonus: localStatBonus, final: finalStat },
        modifier: { base: baseMod, bonus: localModifierBonus, final: finalMod },
        save: { base: baseSave, bonus: localSaveBonus, final: finalSave, isProficient: effectiveIsProficient },
      };
    } else if (config.type === "skill") {
      const skill = config.skill;
      const abilityKey = (skill.toLowerCase() in { athletics: 1 } ? "str" : 
                         ["acrobatics", "sleight_of_hand", "stealth"].includes(skill.toLowerCase()) ? "dex" :
                         ["arcana", "history", "investigation", "nature", "religion"].includes(skill.toLowerCase()) ? "int" :
                         ["animal_handling", "insight", "medicine", "perception", "survival"].includes(skill.toLowerCase()) ? "wis" : "cha");
      
      const ability = abilityKey.toUpperCase() as Ability;
      const finalStat = calculateFinalStat(pers, ability);
      const abilityMod = getAbilityMod(finalStat);
      const modBonus = getModifierBonus(pers, ability);
      
      const pb = calculateFinalProficiency(pers);
      let baseTotal = abilityMod + modBonus;
      
      if (localProficiency === "HALF") baseTotal += Math.floor(pb / 2);
      if (localProficiency === "PROFICIENT") baseTotal += pb;
      if (localProficiency === "EXPERTISE") baseTotal += pb * 2;
      
      const finalTotal = baseTotal + localSkillBonus;
      
      return {
        skill: { base: baseTotal, bonus: localSkillBonus, final: finalTotal },
      };
    } else {
      // Simple bonus
      let baseValue = 0;
      const effectivePers: PersWithRelations = (() => {
        if (config.field !== "ac") return pers;

        const raw = baseACInput.trim();
        if (raw === "") return pers;

        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) return pers;

        return { ...pers, overrideBaseAC: Math.trunc(parsed) };
      })();

      switch (config.field) {
        case "hp": baseValue = pers.maxHp; break;
        case "ac": baseValue = calculateFinalAC(effectivePers) - getSimpleBonus(pers, "ac"); break;
        case "speed": baseValue = 30; break;
        case "proficiency": baseValue = getProficiencyBonus(pers.level); break;
        case "initiative": baseValue = calculateFinalInitiative(pers) - getSimpleBonus(pers, "initiative"); break;
        case "spellAttack": {
          const ability = pers.class?.primaryCastingStat ?? Ability.INT;
          baseValue = calculateSpellAttack(pers, ability) - getSimpleBonus(pers, "spellAttack");
          break;
        }
        case "spellDC": {
          const ability = pers.class?.primaryCastingStat ?? Ability.INT;
          baseValue = calculateSpellDC(pers, ability) - getSimpleBonus(pers, "spellDC");
          break;
        }
        default: baseValue = 0;
      }
      const finalValue = baseValue + localSimpleBonus;
      return {
        simple: { base: baseValue, bonus: localSimpleBonus, final: finalValue },
      };
    }
  }, [config, pers, localStatBonus, localModifierBonus, localSaveBonus, localSkillBonus, localSimpleBonus, localProficiency, localSaveProficiency, statBase, baseStatInput, baseACInput]);


  // Apply optimistic update and save
  const handleSave = async () => {
    if (!config || isSubmitting) return;
    
    setIsSubmitting(true);
    
    // Store previous state for rollback
    const prevPers = pers;
    
    try {
      if (config.type === "stat") {
        // Save base stat AND bonuses
        const ability = config.ability;
        
        const baseInputRaw = Number(baseStatInput);
        const effectiveBase = Number.isFinite(baseInputRaw) ? Math.trunc(baseInputRaw) : (statBase?.base ?? 10);
        
        // Optimistic update
        const nextPers = {
          ...pers,
          [ability.toLowerCase()]: effectiveBase, // Update base stat
          statBonuses: {
            ...(pers as any).statBonuses ?? {},
            [ability]: localStatBonus,
          },
          statModifierBonuses: {
            ...(pers as any).statModifierBonuses ?? {},
            [ability]: localModifierBonus,
          },
          saveBonuses: {
            ...(pers as any).saveBonuses ?? {},
            [ability]: localSaveBonus,
          },
          additionalSaveProficiencies: localSaveProficiency 
            ? Array.from(new Set([...((pers as any).additionalSaveProficiencies ?? []), ability]))
            : ((pers as any).additionalSaveProficiencies ?? []).filter((a: Ability) => a !== ability),
        } as unknown as PersWithRelations;
        
        onPersUpdate(nextPers);

        // Close immediately; persist in background.
        onOpenChange(false);

        void Promise.all([
          updateBaseStat(pers.persId, ability, effectiveBase),
          updateBonus(pers.persId, "stat", ability, localStatBonus),
          updateBonus(pers.persId, "statModifier", ability, localModifierBonus),
          updateBonus(pers.persId, "save", ability, localSaveBonus),
          updateSaveProficiency(pers.persId, ability, localSaveProficiency),
        ])
          .then((results) => {
            const failed = results.find((r) => !r.success);
            if (failed) {
              console.error(failed);
              onPersUpdate(prevPers);
              toast.error("Помилка при збереженні");
              router.refresh();
              return;
            }
            router.refresh();
          })
          .catch((err) => {
            console.error(err);
            onPersUpdate(prevPers);
            toast.error("Помилка при збереженні");
            router.refresh();
          });
        return;
        
      } else if (config.type === "skill") {
        // Store previous state for skill proficiency rollback
        const skill = config.skill;
        const persSkill = pers.skills.find(s => s.name === skill);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const prevProficiency = persSkill?.proficiencyType ?? "NONE";

        // Optimistic update
        const nextPers = {
          ...pers,
          skillBonuses: {
            ...(pers as unknown as { skillBonuses?: Record<string, number> }).skillBonuses ?? {},
            [skill]: localSkillBonus,
          },
          skills: pers.skills.map(s => s.name === skill ? { ...s, proficiencyType: localProficiency } : s),
        } as unknown as PersWithRelations;
        
        // If skill doesn't exist in the list, we'd need to add it, but currently assuming it exists or handled by server
        
        onPersUpdate(nextPers);

        onOpenChange(false);
        void Promise.all([
          updateBonus(pers.persId, "skill", skill, localSkillBonus),
          updateSkillProficiency(pers.persId, skill, localProficiency),
        ])
          .then((results) => {
            const failed = results.find((r) => !r.success) as any;
            if (failed && !failed.success) {
              onPersUpdate(prevPers);
              toast.error(failed.error);
              router.refresh();
              return;
            }
            router.refresh();
          })
          .catch((err) => {
            console.error(err);
            onPersUpdate(prevPers);
            toast.error("Помилка при збереженні");
            router.refresh();
          });
        return;
        
      } else {
        // Simple bonus
        const fieldMap: Record<SimpleBonusField, string> = {
          hp: "hpBonuses",
          ac: "acBonuses",
          speed: "speedBonuses",
          proficiency: "proficiencyBonuses",
          initiative: "initiativeBonuses",
          spellAttack: "spellAttackBonuses",
          spellDC: "spellDCBonuses",
        };
        
        const field = fieldMap[config.field];

        if (config.field === "ac") {
          const raw = baseACInput.trim();
          const nextOverride = raw === "" ? null : Number(raw);

          if (nextOverride !== null && (!Number.isFinite(nextOverride) || nextOverride < 0)) {
            toast.error("Невірне значення базового КБ");
            return;
          }

          const nextOverrideInt = nextOverride === null ? null : Math.trunc(nextOverride);

          const nextPers = {
            ...pers,
            overrideBaseAC: nextOverrideInt,
            [field]: localSimpleBonus === 0 ? null : { value: localSimpleBonus },
          } as unknown as PersWithRelations;

          onPersUpdate(nextPers);
          onOpenChange(false);

          void Promise.all([
            updateBaseACOverride(pers.persId, nextOverrideInt),
            updateBonus(pers.persId, config.field, null, localSimpleBonus),
          ])
            .then((results) => {
              const failed = results.find((r) => !r.success) as any;
              if (failed && !failed.success) {
                onPersUpdate(prevPers);
                toast.error(failed.error);
                router.refresh();
                return;
              }
              router.refresh();
            })
            .catch((err) => {
              console.error(err);
              onPersUpdate(prevPers);
              toast.error("Помилка при збереженні");
              router.refresh();
            });
          return;
        }

        const nextPers = {
          ...pers,
          [field]: localSimpleBonus === 0 ? null : { value: localSimpleBonus },
        } as PersWithRelations;

        onPersUpdate(nextPers);

        onOpenChange(false);
        void updateBonus(pers.persId, config.field, null, localSimpleBonus)
          .then((res) => {
            if (!res.success) {
              onPersUpdate(prevPers);
              toast.error(res.error);
              router.refresh();
              return;
            }
            router.refresh();
          })
          .catch((err) => {
            console.error(err);
            onPersUpdate(prevPers);
            toast.error("Помилка при збереженні");
            router.refresh();
          });
        return;
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Number input with +/- buttons
  const NumberInput = ({
    value,
    onChange,
    label,
    preview,
  }: {
    value: number;
    onChange: (v: number) => void;
    label: string;
    preview?: { base: number; final: number };
  }) => (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-200">{label}</div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-9 w-9"
          onClick={() => onChange(value - 1)}
          disabled={isSubmitting}
        >
          <Minus className="w-4 h-4" />
        </Button>
        <Input
          autoFocus={false}
          type="number"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="w-20 text-center h-9"
          disabled={isSubmitting}
        />
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-9 w-9"
          onClick={() => onChange(value + 1)}
          disabled={isSubmitting}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {preview && (
        <div className="text-xs text-slate-400 flex gap-2">
          <span>{bonusTranslations.baseValue}: <span className="text-slate-300">{preview.base}</span></span>
          <span>→</span>
          <span>{bonusTranslations.finalValue}: <span className="text-emerald-400 font-medium">{preview.final}</span></span>
        </div>
      )}
    </div>
  );

  if (!config) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-sm"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="py-2 overflow-y-auto max-h-[60vh] px-1">
          {config.type === "stat" && previewValues?.stat && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="text-sm font-medium text-slate-200">Режим</div>
                <Tabs value={statMode} onValueChange={(v) => setStatMode(v as "BONUS" | "BASE")}
                >
                  <TabsList className="grid w-full grid-cols-2 bg-slate-800/50">
                    <TabsTrigger value="BONUS" className="text-xs data-[state=active]:bg-slate-700">
                      {bonusTranslations.statBonus}
                    </TabsTrigger>
                    <TabsTrigger value="BASE" className="text-xs data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-200">
                      Базове значення
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="BONUS" className="pt-3">
                    <div className="bg-slate-800/20 p-3 rounded-lg border border-slate-700/30">
                      <NumberInput
                        value={localStatBonus}
                        onChange={setLocalStatBonus}
                        label={bonusTranslations.statBonus}
                        preview={previewValues.stat}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="BASE" className="pt-3">
                    <div className="bg-slate-800/20 p-3 rounded-lg border border-slate-700/30 space-y-2">
                       <div className="text-sm font-medium text-slate-200">Базове значення</div>
                      <Input
                        autoFocus={false}
                        type="number"
                        value={baseStatInput}
                        onChange={(e) => setBaseStatInput(e.target.value)}
                        className="bg-white/5 border-white/10"
                        disabled={isSubmitting}
                      />
                      {statBase ? (
                        <div className="text-xs text-slate-400">
                          Бонус: <span className="text-emerald-400">{localStatBonus > 0 ? `+${localStatBonus}` : localStatBonus}</span>
                        </div>
                      ) : null}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Modifier Bonus */}
              <div className="bg-slate-800/20 p-3 rounded-lg border border-slate-700/30">
                <NumberInput
                  value={localModifierBonus}
                  onChange={setLocalModifierBonus}
                  label={bonusTranslations.modifierBonus}
                  preview={previewValues.modifier}
                />
              </div>

              {/* Save Bonus & Proficiency */}
              <div className="bg-slate-800/20 p-3 rounded-lg border border-slate-700/30 space-y-4">
                <NumberInput
                  value={localSaveBonus}
                  onChange={setLocalSaveBonus}
                  label={bonusTranslations.saveBonus}
                  preview={previewValues.save}
                />
                
                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                  <Label htmlFor="save-proficiency" className="text-sm font-medium text-slate-300">
                    {bonusTranslations.saveProficiency ?? "Володіння рятівним кидком"}
                  </Label>
                  <Switch
                    id="save-proficiency"
                    checked={localSaveProficiency}
                    onCheckedChange={setLocalSaveProficiency}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          )}

          {config.type === "skill" && previewValues?.skill && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="text-sm font-medium text-slate-200">{bonusTranslations.proficiencyLevel}</div>
                <Tabs value={localProficiency} onValueChange={(v) => setLocalProficiency(v as SkillProficiencyType)}>
                  <TabsList className="grid w-full grid-cols-4 bg-slate-800/50">
                    <TabsTrigger value="NONE" className="text-[10px] data-[state=active]:bg-slate-700">
                      {bonusTranslations.proficiencies.NONE}
                    </TabsTrigger>
                    <TabsTrigger value="HALF" className="text-[10px] data-[state=active]:bg-slate-700/60 text-slate-400">
                      {bonusTranslations.proficiencies.HALF}
                    </TabsTrigger>
                    <TabsTrigger value="PROFICIENT" className="text-[10px] data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                      {bonusTranslations.proficiencies.PROFICIENT}
                    </TabsTrigger>
                    <TabsTrigger value="EXPERTISE" className="text-[10px] data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                      {bonusTranslations.proficiencies.EXPERTISE}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <NumberInput
                value={localSkillBonus}
                onChange={setLocalSkillBonus}
                label={bonusTranslations.skillBonus}
                preview={previewValues.skill}
              />
            </div>
          )}

          {config.type === "simple" && previewValues?.simple && (
            config.field === "ac" ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="text-sm font-medium text-slate-200">Режим</div>
                  <Tabs value={statMode} onValueChange={(v) => setStatMode(v as "BONUS" | "BASE")}>
                    <TabsList className="grid w-full grid-cols-2 bg-slate-800/50">
                      <TabsTrigger value="BONUS" className="text-xs data-[state=active]:bg-slate-700">
                        {bonusTranslations.statBonus}
                      </TabsTrigger>
                      <TabsTrigger value="BASE" className="text-xs data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-200">
                        Базове значення
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="BONUS" className="pt-3">
                      <div className="bg-slate-800/20 p-3 rounded-lg border border-slate-700/30">
                        <NumberInput
                          value={localSimpleBonus}
                          onChange={setLocalSimpleBonus}
                          label={bonusTranslations.fieldNames[config.field as keyof typeof bonusTranslations.fieldNames]}
                          preview={previewValues.simple}
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="BASE" className="pt-3">
                      <div className="bg-slate-800/20 p-3 rounded-lg border border-slate-700/30 space-y-2">
                        <div className="text-sm font-medium text-slate-200">Базовий КБ (оверрайд)</div>
                        <Input
                          autoFocus={false}
                          type="number"
                          value={baseACInput}
                          onChange={(e) => setBaseACInput(e.target.value)}
                          placeholder={String(previewValues.simple.base)}
                          className="bg-white/5 border-white/10"
                          disabled={isSubmitting}
                        />
                        <div className="text-xs text-slate-400">
                          Залиши порожнім, щоб використовувати автоматичний розрахунок.
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            ) : (
              <NumberInput
                value={localSimpleBonus}
                onChange={setLocalSimpleBonus}
                label={bonusTranslations.fieldNames[config.field as keyof typeof bonusTranslations.fieldNames]}
                preview={previewValues.simple}
              />
            )
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {bonusTranslations.cancel}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-slate-200"
          >
            {isSubmitting ? bonusTranslations.saving : bonusTranslations.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
