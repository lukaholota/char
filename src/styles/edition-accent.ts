import type { CSSProperties } from "react";

import type { Edition } from "@/rules/route-helpers";
import { ARCANE, PRISM } from "./palette";

/// Акцент редакції — одне місце на весь застосунок (замість 41 інлайнового `is2024 ? …`).
///
/// Схема має дві половини, і плутати їх не можна. **Переливання** живе лише на великому —
/// назва картки, рамка, сяйво; воно працює, поки трапляється рідко. **Суцільний** колір
/// несуть дрібні елементи, яких у списку сотні: градієнт на волосяній рамці в 9px
/// вироджується в бліду обводку й перестає відрізняти редакцію.

export type AccentSchemeName = "arcane" | "prism";

type SolidClassNames = {
  text: string;
  mutedText: string;
  border: string;
  fill: string;
  ring: string;
  strongFill: string;
};

type AccentScheme = {
  sheenStops: readonly string[];
  /// Зачин абзацу й посилання всередині опису. Суцільний колір, а не переливання: inline-елемент
  /// із `background-clip: text` розривається на перенесенні рядка, і кожен шматок дістає
  /// власний градієнт.
  prose: string;
  solid: SolidClassNames;
  /// Різана рамка ілюстрованих карток малює «обрано» кантом і сяйвом, а не кільцем браузера,
  /// тож кольори їй потрібні значеннями, а не класами.
  cutFrame: CutFrameAccent;
};

export type CutFrameAccent = {
  ringColor: string;
  glowColor: string;
  titleClassName: string;
  hoverTitleClassName: string;
};

/// Класи тут написані літералами навмисно: Tailwind знаходить їх скануванням тексту, і
/// зібраний з шматків рядок у збірку не потрапить.
const ACCENT_SCHEMES: Record<AccentSchemeName, AccentScheme> = {
  arcane: {
    sheenStops: [ARCANE[300], ARCANE[400], ARCANE[500]],
    prose: ARCANE[400],
    cutFrame: {
      ringColor: ARCANE[800],
      glowColor: "rgba(65,37,116,0.6)",
      titleClassName: "text-arcane-300",
      hoverTitleClassName: "group-hover:text-arcane-200",
    },
    solid: {
      text: "text-arcane-300",
      mutedText: "text-arcane-200",
      border: "border-arcane-500/40",
      fill: "bg-arcane-500/10",
      ring: "ring-arcane-500/25",
      strongFill: "bg-arcane-500",
    },
  },
  prism: {
    sheenStops: ["#7dd3fc", "#a78bfa", PRISM[200], "#fb7185"],
    prose: PRISM[300],
    cutFrame: {
      /// Кант тут малюється як фон різаної фігури, тож приймає і градієнт — так різана
      /// картка переливається так само, як прямокутна.
      ringColor: "linear-gradient(115deg, #7dd3fc, #a78bfa, #f5c9fa, #fb7185)",
      glowColor: "rgba(92,28,109,0.6)",
      titleClassName: "text-prism-300",
      hoverTitleClassName: "group-hover:text-prism-200",
    },
    solid: {
      text: "text-prism-300",
      mutedText: "text-prism-200",
      border: "border-prism-500/40",
      fill: "bg-prism-500/10",
      ring: "ring-prism-500/25",
      strongFill: "bg-prism-500",
    },
  },
};

/// ▼ Перемикач гами. Щоб віддати 2014 те саме переливання, що й 2024, — змінити тут "arcane"
/// на "prism". Більше ніде нічого міняти не треба.
export const EDITION_SCHEME: Record<Edition, AccentSchemeName> = {
  "2014": "arcane",
  "2024": "prism",
};

/// ▼ Рух переливання. Типово вимкнений: сторінка малюється першим кадром і не рухається.
/// "hover" — повзе лише під курсором на самій картці; "always" — повзе завжди (на сторінці з
/// сотнями рядків це помітний безперервний repaint). Рух іде по `--sheen-loop` — дзеркальній
/// стрічці, що починається й закінчується одним кольором: пряма стрічка на кінці циклу
/// стрибком поверталася з малини в кригу, і цей шов було видно.
export type SheenMotion = "off" | "hover" | "always";
export const SHEEN_MOTION: SheenMotion = "off";

export type EditionAccent = {
  scheme: AccentSchemeName;
  solid: SolidClassNames;
  cutFrame: CutFrameAccent;
  /// Кладеться на елемент; `.sheen-text`, `.sheen-ring` і `.sheen-glow` читають ці змінні.
  vars: CSSProperties;
};

/// Вибір варіанта за схемою редакції — заміна тернарника `is2024 ? … : …` по всьому UI.
/// Через нього перемикач `EDITION_SCHEME` дістає й ті місця, що малюються власними класами,
/// а не ролями зі `solid`. Класи в аргументах мають лишатися літералами: Tailwind шукає їх
/// текстом, і зібраний з шматків рядок у збірку не потрапить.
export function findAccentVariant<T>(is2024: boolean, variants: Record<AccentSchemeName, T>): T {
  return variants[EDITION_SCHEME[is2024 ? "2024" : "2014"]];
}

export function findEditionAccent(edition: Edition): EditionAccent {
  const name = EDITION_SCHEME[edition];
  const scheme = ACCENT_SCHEMES[name];
  return {
    scheme: name,
    solid: scheme.solid,
    cutFrame: scheme.cutFrame,
    vars: buildSheenVariables(scheme),
  };
}


function buildSheenVariables(scheme: AccentScheme): CSSProperties {
  const stops = scheme.sheenStops;
  const edge = stops[stops.length - 1];
  const looped = [...stops, ...stops.slice(0, -1).reverse()];
  return {
    "--sheen": `linear-gradient(100deg, ${stops.join(", ")})`,
    "--sheen-loop": `linear-gradient(100deg, ${looped.join(", ")})`,
    "--sheen-frame": `linear-gradient(115deg, ${stops.map((s) => withAlpha(s, 0.65)).join(", ")})`,
    "--accent-strong": scheme.prose,
    "--accent-link": scheme.prose,
    "--sheen-glow-near": withAlpha(stops[0], 0.16),
    "--sheen-glow-far": withAlpha(edge, 0.2),
  } as CSSProperties;
}

function withAlpha(hex: string, alpha: number): string {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}
