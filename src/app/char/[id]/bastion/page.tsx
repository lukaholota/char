import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BastionPageClient } from "@/app/char/[id]/bastion/BastionPageClient";
import { loadBastion, loadBastionPicker } from "@/lib/actions/bastion-actions";

export const metadata: Metadata = {
  title: "Бастіон персонажа — ДнД українською",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const persId = parseInt(idStr);
  if (isNaN(persId)) notFound();

  const [loaded, picker] = await Promise.all([loadBastion(persId), loadBastionPicker(persId)]);
  if (!loaded.ok || !loaded.standing.access.isOffered) notFound();

  return <BastionPageClient standing={loaded.standing} picker={picker.ok ? picker.picker : null} />;
}
