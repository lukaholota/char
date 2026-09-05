/// Час накладання в базі несе умову спрацювання цілим реченням: «1 реакція, яку ви здійснюєте,
/// коли…». Для картки й фільтра потрібне лише саме значення — умова й так є в описі заклинання.
/// Рішення власника 2026-09-02.

const TRIGGERED_PREFIXES = ["1 реакція", "1 бонусна дія"] as const;

export function shortenCastingTime(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  const lower = text.toLowerCase();
  const prefix = TRIGGERED_PREFIXES.find((candidate) => lower.startsWith(candidate));
  return prefix ? text.slice(0, prefix.length) : text;
}
