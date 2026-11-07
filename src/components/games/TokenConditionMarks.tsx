import { useShownConditions, type TokenRef } from "./use-token-conditions";
import { buildTokenConditionMarks, splitTokenConditionMarks, type TokenConditions } from "@/rules/token-conditions";

/// Під токеном, не на обличчі: до двох скорочень і «+N»; повні назви читає скрінрідер і підказка.
export function TokenConditionMarks({ token, conditions }: { token: TokenRef; conditions: TokenConditions }) {
  const marks = buildTokenConditionMarks(useShownConditions(token, conditions));
  if (!marks.length) return null;
  const { shown, hiddenCount } = splitTokenConditionMarks(marks);
  const fullList = marks.map((mark) => mark.label).join(", ");
  return (
    <span className="mt-0.5 flex items-center justify-center gap-0.5" title={fullList}>
      <span className="sr-only">Стани: {fullList}</span>
      {shown.map((mark) => (
        <span key={mark.key} aria-hidden className="rounded bg-amber-950/90 px-1 text-xs leading-4 text-amber-100 ring-1 ring-amber-400/60">
          {mark.shortLabel}
        </span>
      ))}
      {hiddenCount ? <span aria-hidden className="rounded bg-amber-950/90 px-1 text-xs leading-4 text-amber-100 ring-1 ring-amber-400/60">+{hiddenCount}</span> : null}
    </span>
  );
}
