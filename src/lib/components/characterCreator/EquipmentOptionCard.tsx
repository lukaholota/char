import type { ReactNode } from "react";
import clsx from "clsx";
import { Coins, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EquipmentLine, EquipmentLines } from "./equipment-choices";

type Props = {
  radioName: string;
  title?: string;
  lines: EquipmentLines;
  selected: boolean;
  onSelect?: () => void;
  onPackInfo?: (pack: EquipmentLine) => void;
  children?: ReactNode;
};

/// Один вигляд варіанта майна на весь крок: і класова літера, і пакунок походження. Розділені
/// копії цього віджета вже коштували проєкту «працює на 50 екранах, ламається на 51-му».
export const EquipmentOptionCard = ({
  radioName,
  title,
  lines,
  selected,
  onSelect,
  onPackInfo,
  children,
}: Props) => {
  const selectFromCard = (event: { target: EventTarget | null }) => {
    if (!onSelect) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest?.("[data-stop-card-click]")) return;
    onSelect();
  };

  return (
    <div
      className={clsx(
        "rounded-lg border px-3 py-2",
        selected && onSelect
          ? "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5"
          : "border-white/10 bg-white/5",
      )}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={selectFromCard}
      onKeyDown={(event) => {
        if (!onSelect || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        selectFromCard(event);
      }}
    >
      <div className="flex items-start gap-2">
        {onSelect ? (
          <input
            type="radio"
            name={radioName}
            aria-label={title}
            checked={selected}
            onChange={onSelect}
            className="mt-1 h-4 w-4 shrink-0"
          />
        ) : null}

        <div className="min-w-0 flex-1">
          {title ? <p className="text-sm font-medium text-slate-200">{title}</p> : null}

          <ul className="mt-1 space-y-1">
            {lines.belongings.map((line) => (
              <li key={line.key} className="flex items-start gap-2 text-sm text-slate-300">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-500" />
                <span className="min-w-0 break-words">{line.text}</span>
                {line.pack && onPackInfo ? <PackInfoButton line={line} onOpen={onPackInfo} /> : null}
              </li>
            ))}
          </ul>

          {lines.coins.length ? (
            <div className="mt-2 border-t border-white/10 pt-2">
              {lines.coins.map((line) => (
                <p key={line.key} className="flex items-center gap-2 text-sm font-medium text-amber-200">
                  <Coins aria-hidden className="h-4 w-4 shrink-0" />
                  <span className="break-words">{line.text}</span>
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {children}
    </div>
  );
};

const PackInfoButton = ({ line, onOpen }: { line: EquipmentLine; onOpen: (line: EquipmentLine) => void }) => (
  <Button
    type="button"
    size="icon"
    variant="secondary"
    data-stop-card-click
    className="glass-panel border-gradient-rpg h-6 w-6 shrink-0 rounded-full text-slate-100 hover:text-white focus-visible:ring-arcane-400/30"
    aria-label={`Що входить до: ${line.text}`}
    onClick={(event) => {
      event.stopPropagation();
      onOpen(line);
    }}
  >
    <HelpCircle className="h-3.5 w-3.5" />
  </Button>
);

export default EquipmentOptionCard;
