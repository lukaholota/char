import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomebrewCreatureForm } from "@/components/homebrew/HomebrewCreatureForm";
import { HomebrewPageShell } from "@/components/homebrew/HomebrewPageShell";
import { HomebrewSpellForm } from "@/components/homebrew/HomebrewSpellForm";
import { readCreatureFormValues, readSpellFormValues } from "@/lib/logic/homebrew-form-values";
import { loadHomebrewEditValues } from "@/lib/actions/homebrew-actions";

export const metadata: Metadata = { title: "Редагування хоумбрю — ДнД українською", robots: { index: false } };

export default async function EditHomebrewPage({ params }: { params: Promise<{ entryId: string }> }) {
  const edit = await loadHomebrewEditValues(Number((await params).entryId));
  if (!edit) notFound();

  return (
    <HomebrewPageShell title={`Редагування: ${String(edit.values.name)}`} backHref={`/homebrew/${edit.entryId}`} backLabel="Назад">
      {edit.kind === "SPELL" ? (
        <HomebrewSpellForm entryId={edit.entryId} initialValues={readSpellFormValues(edit.values)} />
      ) : (
        <HomebrewCreatureForm entryId={edit.entryId} initialValues={readCreatureFormValues(edit.values)} initialImageUrl={edit.imageUrl} />
      )}
    </HomebrewPageShell>
  );
}
