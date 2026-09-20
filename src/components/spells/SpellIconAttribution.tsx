import { SPELL_ICON_ATTRIBUTION } from "@/lib/refs/icon-attribution";

/** Вимога Larian Fan Content Policy: іконки підписані, і підпис каже, що проєкт неофіційний. */
export function SpellIconAttribution() {
  return (
    <p className="px-2 py-4 text-center text-[11px] leading-relaxed text-slate-500">
      Частина іконок заклинань — з{" "}
      <a href="https://bg3.wiki" target="_blank" rel="noreferrer noopener" className="underline underline-offset-2 hover:text-slate-400">
        bg3.wiki
      </a>
      , © Larian Studios; решта зроблена для цього проєкту. Неофіційний фанатський проєкт; не створений і не спонсорований Larian Studios. Умови —{" "}
      <a
        href="https://larian.com/fan-content-policy"
        target="_blank"
        rel="noreferrer noopener"
        className="underline underline-offset-2 hover:text-slate-400"
      >
        Larian Fan Content Policy
      </a>
      .
    </p>
  );
}

export const SPELL_ICON_ATTRIBUTION_TEXT = SPELL_ICON_ATTRIBUTION.text;
