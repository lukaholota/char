"use client";

import { useContext, useEffect, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToolPanel } from "./MapToolbar";
import { HeroTokenSlotContext } from "./room-tabs";
import { DELETE_KEYS, ESCAPE_KEYS, useMapKey } from "./use-map-key";
import { TokenLookControls, TokenTransformPanel, type SelectedToken, type TokenPanelTab, type TokenSelection } from "./TokenTransformControls";

type Props = { token: SelectedToken; selection: TokenSelection; isSide: boolean; lights: ReactNode; scope: RefObject<HTMLElement | null> };

/// На компʼютері вибраний токен одразу показує збоку свій лист: статблок істоти — тут же, лист героя — у вкладці «Герой» кімнати.
/// Рідкісні налаштування токена чекають у вкладці «Токен». На телефоні лишається коротка панель, а лист відкриває другий дотик.
export function SelectedTokenPanel({ token, selection, isSide, lights, scope }: Props) {
  const hasSheet = token.sheet !== null || token.showRoomSheet !== null;
  const tab: TokenPanelTab = hasSheet ? selection.tab : "token";
  const isRoomSheetShown = isSide && tab === "sheet" && token.showRoomSheet !== null;
  useRoomSheet(token, isRoomSheetShown);
  const heroTokenSlot = useContext(HeroTokenSlotContext);
  const close = () => selection.select(null);
  useMapKey(DELETE_KEYS, () => token.remove?.(), scope);
  useMapKey(ESCAPE_KEYS, close, scope);
  const chooseTab = (next: TokenPanelTab) => selection.select(token.key, next);
  if (!isSide) return <TokenTransformPanel token={token} onClose={close}>{lights}</TokenTransformPanel>;
  if (isRoomSheetShown) return heroTokenSlot ? createPortal(<ShowTokenTabButton name={token.name} onClick={() => chooseTab("token")} />, heroTokenSlot) : null;
  return (
    <ToolPanel title={token.name} onClose={close}>
      {hasSheet ? <PanelTabs token={token} tab={tab} onChoose={chooseTab} /> : null}
      <div role="tabpanel" aria-label={tab === "sheet" ? token.sheetLabel : "Токен"} className="grid gap-3">
        {tab === "sheet" ? token.sheet : <TokenSettings token={token} lights={lights} hasSheet={hasSheet} />}
      </div>
    </ToolPanel>
  );
}

/// Лист героя живе у вкладці «Герой» кімнати, тож вибір героя лише перемикає її на нього.
function useRoomSheet(token: SelectedToken, isShown: boolean) {
  const shownKey = isShown ? token.key : null;
  useEffect(() => {
    if (shownKey) token.showRoomSheet?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- відкриває лист раз на вибір героя, а не на кожен рендер
  }, [shownKey]);
}

function ShowTokenTabButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={`Токен «${name}»: стани й вигляд`} title="Стани й вигляд токена. Те саме — ще один дотик по токену на мапі." className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-white/15 px-3 text-sm text-slate-200 hover:bg-white/5">
      <Settings2 className="h-4 w-4" aria-hidden />
      Токен
    </button>
  );
}

function PanelTabs({ token, tab, onChoose }: { token: SelectedToken; tab: TokenPanelTab; onChoose: (tab: TokenPanelTab) => void }) {
  const options: Array<{ value: TokenPanelTab; label: string }> = [{ value: "sheet", label: token.sheetLabel }, { value: "token", label: "Токен" }];
  return (
    <div role="tablist" aria-label="Що показати" className="grid grid-cols-2 gap-1.5">
      {options.map((option) => (
        <button key={option.value} type="button" role="tab" aria-selected={tab === option.value} onClick={() => onChoose(option.value)} className={cn("h-11 rounded-xl border text-sm", tab === option.value ? "border-white/30 bg-white/10 text-slate-100" : "border-white/10 text-slate-400 hover:text-slate-200")}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

function TokenSettings({ token, lights, hasSheet }: { token: SelectedToken; lights: ReactNode; hasSheet: boolean }) {
  return (
    <>
      <TokenLookControls token={token} />
      {lights}
      {token.settings}
      <p className="text-sm leading-snug text-slate-400">
        На мапі тягніть верхню ручку, щоб повернути, і кутову, щоб змінити розмір.{hasSheet ? ` Ще один дотик по токену повертає «${token.sheetLabel}».` : ""}
      </p>
    </>
  );
}
