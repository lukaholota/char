"use client";

import type { MouseEvent } from "react";

import { FilterChip } from "@/components/catalogs/FilterChip";

const SCOPE_ATTRIBUTE = "data-jump-scope";
const TARGET_ATTRIBUTE = "data-jump-target";

/// Шукаємо ціль від кнопки вгору до своєї картки: десктопна панель і мобільна модалка можуть
/// бути в DOM одночасно, тож глобальний id знайшов би не ту копію.
export const jumpTargetAttributes = {
  scope: { [SCOPE_ATTRIBUTE]: "" },
  target: (id: string) => ({ [TARGET_ATTRIBUTE]: id }),
};

type JumpNavItem = { id: string; label: string };

export function SectionJumpNav({
  title,
  items,
  is2024 = false,
}: {
  title: string;
  items: JumpNavItem[];
  is2024?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label={title} className="mt-4">
      <div className="mb-1.5 text-[11px] uppercase tracking-wider text-slate-500">{title}</div>
      <ul className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        {items.map((item) => (
          <li key={item.id} className="shrink-0">
            <FilterChip
              label={item.label}
              selected={false}
              is2024={is2024}
              onClick={(event) => scrollToJumpTarget(event, item.id)}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

/// Картка домальовує розділи у фоні (useIsDeferredRenderReady), тож ранній тап може не
/// застати ціль — чекаємо її кілька кадрів, а не мовчки ігноруємо тап.
const MAX_FRAMES_TO_WAIT_FOR_TARGET = 60;

function scrollToJumpTarget(event: MouseEvent<HTMLButtonElement>, id: string) {
  const scope = event.currentTarget.closest(`[${SCOPE_ATTRIBUTE}]`);
  if (scope) scrollWhenTargetAppears(scope, id, MAX_FRAMES_TO_WAIT_FOR_TARGET);
}

/// Перехід із пошуку приходить не з кнопки всередині картки, а з адреси, тож своєї області в
/// нього немає: беремо останню видиму — мобільна модалка малюється після десктопної панелі.
export function scrollToVisibleJumpTarget(id: string | null | undefined) {
  if (id) scrollWhenVisibleTargetAppears(id, MAX_FRAMES_TO_WAIT_FOR_TARGET);
}

function scrollWhenVisibleTargetAppears(id: string, framesLeft: number) {
  const scopes = [...document.querySelectorAll(`[${SCOPE_ATTRIBUTE}]`)].reverse();
  const scope = scopes.find((candidate) => isVisible(candidate) && findTarget(candidate, id));
  if (scope) {
    scrollWhenTargetAppears(scope, id, MAX_FRAMES_TO_WAIT_FOR_TARGET);
    return;
  }
  if (framesLeft > 0) requestAnimationFrame(() => scrollWhenVisibleTargetAppears(id, framesLeft - 1));
}

function isVisible(element: Element): boolean {
  return element instanceof HTMLElement && element.offsetParent !== null;
}

function findTarget(scope: Element, id: string): Element | null {
  return scope.querySelector(`[${TARGET_ATTRIBUTE}="${CSS.escape(id)}"]`);
}

function scrollWhenTargetAppears(scope: Element, id: string, framesLeft: number) {
  const target = findTarget(scope, id);
  if (target) {
    target.scrollIntoView({ block: "start", behavior: "smooth" });
    return;
  }
  if (framesLeft > 0) requestAnimationFrame(() => scrollWhenTargetAppears(scope, id, framesLeft - 1));
}
