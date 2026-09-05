"use client";

import React from "react";
import { MENU_PANEL } from "@/components/ui/menu-panel";
import { cn } from "@/lib/utils";
import { findRulesetInPathname, openTermLink } from "@/lib/term-link";

/// Український термін з англійським оригіналом поруч ([Р20](../../../docs/DECISIONS.md#р20)).
///
/// Оригінал показується **плаваючою** підказкою: наведення відкриває її мишею, дотик —
/// перемикає на телефоні, де наведення не існує взагалі. Підказка лежить поза потоком
/// (`absolute`), тому не зсуває ані рядок, ані абзац. Попередня версія дописувала «[Insight]»
/// звичайним текстом — на статблоці з десятком термінів кожне натискання перекладало весь
/// текст після нього, і читач губив рядок, який читав.
///
/// Рідна підказка браузера (`<abbr title>`) тут не годиться: вона зʼявляється із затримкою
/// в секунду, не стилізується й на дотику не показується ніколи.
///
/// Друге натискання — коли оригінал уже видно — відкриває модалку терміна (KR30.3): мишею це
/// клік по наведеному слову, на телефоні — другий дотик. Редакція береться зі сторінки.
/// «Чи було видно» рахується на момент `pointerdown`, а не `click`: на дотику між ними стає
/// `focus`, який сам відкриває підказку, і один дотик відкривав би модалку одразу.
export function GlossaryTerm({
  original,
  children,
}: {
  original: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [nudge, setNudge] = React.useState(0);
  const wrapper = React.useRef<HTMLSpanElement>(null);
  const bubble = React.useRef<HTMLSpanElement>(null);
  const wasOpenAtPress = React.useRef<boolean | null>(null);

  useCloseOnOutsidePress(isOpen, wrapper, () => setIsOpen(false));
  useKeepInsideViewport(isOpen, bubble, setNudge);

  if (original === "") return <>{children}</>;

  const openTerm = () => {
    setIsOpen(false);
    openTermLink({ original, ruleset: findRulesetInPathname(window.location.pathname) }, readPlainText(children));
  };

  return (
    <span ref={wrapper} className="relative inline">
      <span
        role="button"
        tabIndex={0}
        aria-label={`${readPlainText(children)} — ${original}`}
        aria-expanded={isOpen}
        onPointerEnter={(event) => event.pointerType === "mouse" && setIsOpen(true)}
        onPointerLeave={(event) => event.pointerType === "mouse" && setIsOpen(false)}
        onPointerDown={() => {
          wasOpenAtPress.current = isOpen;
        }}
        onClick={(event) => {
          event.stopPropagation();
          const wasOpen = wasOpenAtPress.current ?? isOpen;
          wasOpenAtPress.current = null;
          if (wasOpen) return openTerm();
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") return setIsOpen(false);
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopPropagation();
          if (isOpen) return openTerm();
          setIsOpen(true);
        }}
        className="cursor-pointer border-b border-dotted border-slate-500 no-underline outline-none hover:border-arcane-400 focus-visible:border-arcane-400"
      >
        {children}
      </span>

      {isOpen && (
        <span
          ref={bubble}
          role="tooltip"
          style={{ transform: `translateX(calc(-50% + ${nudge}px))` }}
          className={cn(
            MENU_PANEL,
            "pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 block w-max",
            "max-w-[min(18rem,80vw)] px-2 py-1 text-center font-mono text-[0.85em] leading-snug text-arcane-200"
          )}
        >
          {original}
        </span>
      )}
    </span>
  );
}

/// Дотик поза терміном закриває підказку — інакше на телефоні вона лишалася б відкритою до
/// перезавантаження сторінки, бо `onPointerLeave` там не настає ніколи.
function useCloseOnOutsidePress(
  isOpen: boolean,
  wrapper: React.RefObject<HTMLSpanElement | null>,
  close: () => void
): void {
  React.useEffect(() => {
    if (!isOpen) return;

    const onPress = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) close();
    };

    document.addEventListener("pointerdown", onPress);
    return () => document.removeEventListener("pointerdown", onPress);
  }, [isOpen, wrapper, close]);
}

/// Термін біля краю екрана виносив би підказку за межу вікна: вона центрована на слові, а
/// слово може стояти першим у рядку. Зсуваємо рівно на стільки, скільки бракує, і лише коли
/// бракує, — на вузькому екрані це різниця між читабельним оригіналом і обрізаним.
function useKeepInsideViewport(
  isOpen: boolean,
  bubble: React.RefObject<HTMLSpanElement | null>,
  setNudge: (value: number) => void
): void {
  React.useEffect(() => {
    if (!isOpen || !bubble.current) return setNudge(0);

    const margin = 8;
    const box = bubble.current.getBoundingClientRect();
    if (box.left < margin) return setNudge(margin - box.left);
    if (box.right > window.innerWidth - margin) {
      return setNudge(window.innerWidth - margin - box.right);
    }
    setNudge(0);
  }, [isOpen, bubble, setNudge]);
}

function readPlainText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(readPlainText).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return readPlainText(node.props.children);
  }
  return "";
}
