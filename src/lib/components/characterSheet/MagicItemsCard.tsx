"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PersWithRelations } from "@/lib/actions/pers";
import { deleteMagicItem, drinkPotion, stepMagicItemCharges, updateMagicItem } from "@/lib/actions/magic-item-actions";
import { openRoomRoll } from "@/lib/components/game/open-room-roll";
import { MagicItemInfoModal } from "@/lib/components/levelUp/MagicItemInfoModal";
import { listManualBonusOverlaps } from "@/lib/logic/magic-item-sheet-status";
import { describeMissingSteps, findMissingActivationSteps, isMagicItemActive } from "@/lib/logic/magic-item-activation";
import { hasCountedEffects } from "@/lib/logic/magic-item-effect-text";
import { findAttunementCapacityForPers } from "@/rules/attunement";
import { findPersHouseRules } from "@/lib/logic/pers-house-rules";
import { findMagicItemEffects } from "@/rules/magic-item-effects";
import { findMagicItemState } from "@/rules/magic-item-states";
import AddMagicItemDialog from "./AddMagicItemDialog";
import { PICK_WEAPON_HINT, MagicItemRow, hasSheetUse, type MagicItemLinkUpdates, type PersMagicItemLink } from "./MagicItemRow";
import { MagicItemSheetStatus, MagicItemStateSwitch, PotionDrinkPanel } from "./MagicItemSheetStatus";
import { describePotionDrink } from "@/lib/logic/potion-drink-text";
import { isDrinkableMagicItem } from "@/rules/potions";
import { findMagicWeaponTraits } from "@/rules/magic-weapons";
import { findPersWeaponName } from "@/lib/logic/weapon-name";
import { MagicWeaponLinkPanel } from "./MagicWeaponLinkPanel";
import { PersHouseRulesDialog } from "./PersHouseRulesDialog";
import { MagicItemSpellUsePanel } from "./MagicItemSpellUsePanel";
import { buildItemSpellRoll } from "./slides/sheet-spell-rolls";
import { fillDefaultCharges, findItemChargeRules, pluralizeCharges } from "@/rules/magic-item-charge-text";
import { ItemRollUseContext, type ItemRollUse } from "@/lib/components/magicItems/item-roll-use";
import { describeCharges, findItemSpellUse, type ItemSpellUse } from "@/rules/magic-item-spell-uses";

export function MagicItemsCard({ pers, isReadOnly }: { pers: PersWithRelations; isReadOnly?: boolean }) {
  const router = useRouter();
  const [selectedLinkId, setSelectedLinkId] = useState<number | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<number>>(() => new Set());
  const [isPending, startTransition] = useTransition();

  const magicItems = pers.magicItems ?? [];
  const attunedCount = magicItems.filter((pmi) => pmi.isAttuned).length;
  const attunementCapacity = useMemo(() => findAttunementCapacityForPers(pers, findPersHouseRules(pers).attunementLimit), [pers]);
  const selected = magicItems.find((pmi) => pmi.persMagicItemId === selectedLinkId) ?? null;

  const updateLink = (pmi: PersMagicItemLink, updates: MagicItemLinkUpdates) =>
    startTransition(async () => {
      const res = await updateMagicItem(pmi.persMagicItemId, updates);
      if (!res.success) return void toast.error(res.error);
      announceLinkChange(pers, pmi, updates);
      router.refresh();
    });

  const drink = (pmi: PersMagicItemLink) =>
    startTransition(async () => {
      const res = await drinkPotion(pmi.persMagicItemId);
      if (!res.success) return void toast.error(res.error);
      const text = describePotionDrink(res);
      toast.success(text.title, { description: text.description });
      setSelectedLinkId(null);
      router.refresh();
    });

  const castFromItem = (pmi: PersMagicItemLink, use: ItemSpellUse, charges: number) =>
    startTransition(async () => {
      if (findLinkCharges(pmi).chargesMax !== null) {
        const res = await stepMagicItemCharges(pmi.persMagicItemId, -charges).catch(() => null);
        if (!res?.success) return void toast.error(res?.error ?? "Немає звʼязку з сервером — спробуйте ще раз");
      }
      toast.success(`${pmi.magicItem.name}: ${describeCharges(use, charges)}`);
      setSelectedLinkId(null);
      const roll = buildItemSpellRoll({ pers, itemName: pmi.magicItem.name, use, charges });
      if (roll) openRoomRoll(roll);
      router.refresh();
    });

  const startItemRoll = async (pmi: PersMagicItemLink, chargeCost: number) => {
    if (chargeCost) {
      const res = await stepMagicItemCharges(pmi.persMagicItemId, -chargeCost).catch(() => null);
      if (!res?.success) {
        toast.error(res?.error ?? "Немає звʼязку з сервером — спробуйте ще раз");
        return false;
      }
      toast.success(`${pmi.magicItem.name}: −${chargeCost} ${pluralizeCharges(chargeCost)}`);
      router.refresh();
    }
    setSelectedLinkId(null);
    return true;
  };
  const itemRollUse: ItemRollUse | null = selected && hasDescriptionRolls(selected, isReadOnly) ? { chargesLeft: findLinkCharges(selected).chargesCurrent, isPending, startRoll: (cost) => startItemRoll(selected, cost) } : null;

  const removeLink = (pmi: PersMagicItemLink) => {
    setRemovingIds((prev) => new Set(prev).add(pmi.persMagicItemId));
    setTimeout(async () => {
      const res = await deleteMagicItem(pmi.persMagicItemId);
      if (res.success) {
        toast.success("Предмет видалено");
        router.refresh();
        return;
      }
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(pmi.persMagicItemId);
        return next;
      });
      toast.error(res.error);
    }, 300);
  };

  return (
    <>
      <Card className="bg-slate-900/50 border-white/10 overflow-hidden">
        <CardHeader className="p-4 flex flex-row items-center justify-between border-b border-white/5 bg-white/5">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-violet-300 uppercase tracking-wider">
            <Sparkles className="w-5 h-5" />
            Магічні предмети
            <AttunementBadge pers={pers} attunedCount={attunedCount} capacity={attunementCapacity} isReadOnly={isReadOnly} />
          </CardTitle>
          {!isReadOnly && <AddMagicItemDialog persId={pers.persId} persName={pers.name} ruleset={pers.ruleset} />}
        </CardHeader>
        <CardContent className="p-2 space-y-0">
          {magicItems.length > 0 ? (
            magicItems.map((pmi) => (
              <MagicItemRow
                key={pmi.persMagicItemId}
                pmi={pmi}
                isReadOnly={isReadOnly}
                isRemoving={removingIds.has(pmi.persMagicItemId)}
                isPending={isPending}
                onSelect={() => setSelectedLinkId(pmi.persMagicItemId)}
                onChargesChanged={() => router.refresh()}
                onDelete={() => removeLink(pmi)}
                onUpdate={(updates) => updateLink(pmi, updates)}
              />
            ))
          ) : (
            <div className="text-center py-6 text-slate-500 text-sm">Магічні предмети не додані</div>
          )}
        </CardContent>
      </Card>

      <ItemRollUseContext.Provider value={itemRollUse}>
        <MagicItemInfoModal
          item={selected?.magicItem}
          hasRollChips={itemRollUse !== null}
          open={Boolean(selected)}
          onOpenChange={(open) => !open && setSelectedLinkId(null)}
          sheetStatus={
            selected &&
            (isDrinkableMagicItem(selected.magicItem) ? (
              <PotionDrinkPanel item={selected.magicItem} state={findMagicItemState(selected.magicItem)} isAtFullHp={pers.currentHp >= pers.maxHp} isReadOnly={isReadOnly} isPending={isPending} onDrink={() => drink(selected)} />
            ) : (
              buildSheetStatus(pers, selected, isReadOnly, isPending, (updates) => updateLink(selected, updates), (use, charges) => castFromItem(selected, use, charges))
            ))
          }
        />
      </ItemRollUseContext.Provider>
    </>
  );
}

/// Намисто й палички кидають своєю кнопкою «Кинути», зілля — «Випити»; дублювати їх кубиками в описі — плутати.
function hasDescriptionRolls(pmi: PersMagicItemLink, isReadOnly: boolean | undefined): boolean {
  return !isReadOnly && !findItemSpellUse(pmi.magicItem) && !isDrinkableMagicItem(pmi.magicItem) && findMissingActivationSteps(pmi).length === 0;
}

function buildSheetStatus(
  pers: PersWithRelations,
  pmi: PersMagicItemLink,
  isReadOnly: boolean | undefined,
  isPending: boolean,
  onUpdate: (updates: MagicItemLinkUpdates) => void,
  onUseSpell: (use: ItemSpellUse, charges: number) => void,
) {
  const effects = findMagicItemEffects(pmi.magicItem);
  const state = findMagicItemState(pmi.magicItem);
  const weaponTraits = findMagicWeaponTraits(pmi.magicItem);
  const spellUse = findItemSpellUse(pmi.magicItem);
  const isCounted = hasCountedEffects(effects);
  const hasRollsOnly = !isCounted && !state && !weaponTraits && !spellUse && hasSheetUse(pmi.magicItem);
  if (!hasRollsOnly && !isCounted && !state && !weaponTraits && !spellUse) return null;
  const missingSteps = findMissingActivationSteps(pmi);
  return (
    <>
      <MagicItemSheetStatus
        missingSteps={missingSteps}
        manualOverlaps={listManualBonusOverlaps(pers, effects)}
        hasCountedEffects={isCounted || Boolean(weaponTraits && (pmi.persWeaponId !== null || missingSteps.length > 0))}
        activationLabel={hasRollsOnly ? "Кидати кубики з опису" : state?.activationLabel}
        isReadOnly={isReadOnly}
        isPending={isPending}
        onActivate={(step) => onUpdate(step === "EQUIP" ? { isEquipped: true } : { isAttuned: true })}
      />
      {weaponTraits && (
        <MagicWeaponLinkPanel
          pers={pers}
          linkedWeaponId={pmi.persWeaponId}
          isReadOnly={isReadOnly}
          isPending={isPending}
          onLink={(persWeaponId) => onUpdate(persWeaponId !== null && !pmi.isEquipped ? { persWeaponId, isEquipped: true } : { persWeaponId })}
        />
      )}
      {state && missingSteps.length === 0 ? <MagicItemStateSwitch magicItemId={pmi.magicItemId} state={state} /> : null}
      {spellUse && missingSteps.length === 0 && !isReadOnly ? <MagicItemSpellUsePanel use={spellUse} chargesLeft={findLinkCharges(pmi).chargesCurrent} isPending={isPending} onUse={(charges) => onUseSpell(spellUse, charges)} /> : null}
    </>
  );
}

const findLinkCharges = (pmi: PersMagicItemLink) => fillDefaultCharges({ chargesMax: pmi.chargesMax, chargesCurrent: pmi.chargesCurrent }, findItemChargeRules(pmi.magicItem.description));

function announceLinkChange(pers: PersWithRelations, pmi: PersMagicItemLink, updates: MagicItemLinkUpdates) {
  if (updates.persWeaponId !== undefined) return announceWeaponLink(pers, pmi, updates.persWeaponId);
  const name = pmi.magicItem.name;
  const title = `${describeLinkChange(updates)}: ${name}`;
  const isCounted = hasCountedEffects(findMagicItemEffects(pmi.magicItem));
  const wasActive = isMagicItemActive(pmi);
  const missingNow = findMissingActivationSteps({ ...pmi, ...updates });
  const becameActive = !wasActive && missingNow.length === 0;
  const state = findMagicItemState(pmi.magicItem);

  if (becameActive && state && !isCounted) return void toast.success(title, { description: `Тепер можна «${state.activationLabel}» — у картці предмета або в «Станах».` });
  if (becameActive && pmi.persWeaponId === null && findMagicWeaponTraits(pmi.magicItem)) return void toast.success(title, { description: PICK_WEAPON_HINT });
  if (!isCounted) return void toast.success(title);
  if (becameActive) return void toast.success(`${name} діє`, { description: "Лист уже враховує його бонуси." });
  if (wasActive && missingNow.length > 0) return void toast(`${name} більше не діє`, { description: "Його бонуси прибрано з чисел листа." });
  toast.success(title, { description: missingNow.length > 0 ? `Щоб предмет почав діяти, ${describeMissingSteps(missingNow)}.` : undefined });
}

function describeLinkChange(updates: MagicItemLinkUpdates): string {
  if (updates.isEquipped !== undefined) return updates.isEquipped ? "Екіпіровано" : "Знято";
  return updates.isAttuned ? "Налаштовано" : "Налаштування скасовано";
}

function announceWeaponLink(pers: PersWithRelations, pmi: PersMagicItemLink, persWeaponId: number | null) {
  const name = pmi.magicItem.name;
  const weapon = pers.weapons.find((pw) => pw.persWeaponId === persWeaponId);
  if (!weapon) return void toast(`${name} відвʼязано від зброї`, { description: "Його бонуси прибрано з атаки й шкоди." });
  const missing = findMissingActivationSteps({ ...pmi, isEquipped: true });
  toast.success(`${name} — це «${findPersWeaponName(pers, weapon)}»`, {
    description: missing.length > 0 ? "Налаштуйтеся на предмет — тоді лист додасть його бонуси до атаки й шкоди." : "Бонуси предмета вже в атаці й шкоді цієї зброї та в кидку.",
  });
}

function AttunementBadge({ pers, attunedCount, capacity, isReadOnly }: { pers: PersWithRelations; attunedCount: number; capacity: number; isReadOnly?: boolean }) {
  const className = `text-xs px-1.5 py-0.5 rounded border normal-case tracking-normal font-normal ${attunedCount >= capacity ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-white/5 text-slate-400 border-white/10"}`;
  const label = `${attunedCount} / ${capacity}`;
  if (isReadOnly) return <span className={className} title="Налаштовано / Ліміт налаштування">{label}</span>;
  return <PersHouseRulesDialog pers={pers} trigger={<button type="button" className={`${className} min-h-8 hover:bg-white/10`} aria-label={`Налаштовано ${label}. Змінити ліміт налаштування`}>{label}</button>} />;
}
