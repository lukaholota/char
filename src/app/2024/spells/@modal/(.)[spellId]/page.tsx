import { getSpellByIdOrSlug } from "@/lib/spellsData";
import { SpellModalShell } from "@/components/spells/SpellModalShell";

export default async function SpellModalPage({
  params,
}: {
  params: Promise<{ spellId: string }>;
}) {
  const { spellId } = await params;
  return <SpellModalShell spell={getSpellByIdOrSlug(spellId, "RULES_2024") ?? null} is2024 />;
}
