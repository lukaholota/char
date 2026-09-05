import { Button } from "@/components/ui/button";

type Props = {
  weaponNames: string[];
  onPick: (weaponIndex: number) => void;
};

/// Рядок «зброя на вибір» показує обране й дає його перебрати. Живе окремо, щоб картка
/// варіанта лишалася про склад майна, а не про діалог вибору зброї.
export const EquipmentWeaponPicks = ({ weaponNames, onPick }: Props) => (
  <div className="mt-2 space-y-2">
    {weaponNames.map((name, weaponIndex) => (
      <div
        key={weaponIndex}
        className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
      >
        <div className="min-w-0">
          <p className="text-xs text-slate-400">Зброя #{weaponIndex + 1}</p>
          <p className="break-words">{name}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          data-stop-card-click
          className="shrink-0 border border-white/15 bg-white/5 text-slate-100 hover:bg-white/7"
          onClick={(event) => {
            event.stopPropagation();
            onPick(weaponIndex);
          }}
        >
          Обрати зброю
        </Button>
      </div>
    ))}
  </div>
);

export default EquipmentWeaponPicks;
