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

function scrollToJumpTarget(event: MouseEvent<HTMLButtonElement>, id: string) {
  const scope = event.currentTarget.closest(`[${SCOPE_ATTRIBUTE}]`);
  const target = scope?.querySelector(`[${TARGET_ATTRIBUTE}="${CSS.escape(id)}"]`);
  target?.scrollIntoView({ block: "start", behavior: "smooth" });
}
