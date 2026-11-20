import type { PersWithRelations } from "@/lib/actions/pers";
import { hasManualWeaponBonus } from "@/lib/logic/magic-weapon-links";
import { findPersWeaponName } from "@/lib/logic/weapon-name";
import { STATUS_SECTION_CLASS } from "./MagicItemSheetStatus";

type Props = {
  pers: PersWithRelations;
  linkedWeaponId: number | null;
  isReadOnly?: boolean;
  isPending: boolean;
  onLink: (persWeaponId: number | null) => void;
};

/// Магічна зброя знає свій рядок на листі: туди лист додає +N і кубики при влучанні.
export function MagicWeaponLinkPanel({ pers, linkedWeaponId, isReadOnly, isPending, onLink }: Props) {
  const labels = labelWeapons(pers);
  const linked = pers.weapons.find((pw) => pw.persWeaponId === linkedWeaponId) ?? null;
  const linkedName = linked ? labels.get(linked.persWeaponId) : null;

  return (
    <div className={`${STATUS_SECTION_CLASS} text-sm`}>
      <p className="font-semibold text-slate-100">Зброя на листі</p>
      <p className="mt-0.5 text-xs leading-snug text-slate-400">
        {linkedName
          ? `Бонуси предмета рахуються в атаці «${linkedName}». Торкніться іншої зброї, щоб перенести, або цієї — щоб відвʼязати.`
          : pers.weapons.length > 0
            ? "Оберіть, яка зброя на листі — цей предмет, і лист додасть його бонуси до її атаки й шкоди."
            : "Додайте цю зброю в «Зброя та атаки», тоді оберіть її тут — і лист додасть бонуси предмета до атаки й шкоди."}
      </p>
      {!isReadOnly && pers.weapons.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {pers.weapons.map((pw) => {
            const isLinked = pw.persWeaponId === linkedWeaponId;
            return (
              <button
                key={pw.persWeaponId}
                type="button"
                aria-pressed={isLinked}
                disabled={isPending}
                onClick={() => onLink(isLinked ? null : pw.persWeaponId)}
                className={`min-h-9 rounded-lg border px-3 text-sm transition-colors disabled:opacity-60 ${
                  isLinked ? "border-violet-400/60 bg-violet-500/20 text-violet-100" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {labels.get(pw.persWeaponId)}
              </button>
            );
          })}
        </div>
      )}
      {linked && hasManualWeaponBonus(linked) && (
        <p className="mt-2 text-amber-200/90">
          У «{linkedName}» вписано ручний бонус до атаки чи шкоди. Якщо це бонус цього предмета — приберіть його в налаштуваннях зброї, бо інакше він рахується двічі.
        </p>
      )}
    </div>
  );
}

/// Дві однакові палиці на листі отримують номери, щоб було видно, яку обрано.
function labelWeapons(pers: PersWithRelations): Map<number, string> {
  const names = pers.weapons.map((pw) => findPersWeaponName(pers, pw));
  return new Map(
    pers.weapons.map((pw, index) => {
      const same = names.filter((name) => name === names[index]).length;
      const order = names.slice(0, index + 1).filter((name) => name === names[index]).length;
      return [pw.persWeaponId, same > 1 ? `${names[index]} ${order}` : names[index]];
    }),
  );
}
