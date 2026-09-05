import { getMagicItemById } from "@/lib/magicItemsData";
import { MagicItemModal } from "./MagicItemModal";

export default async function MagicItemModalPage({
  params,
}: {
  params: Promise<{ magicItemId: string }>;
}) {
  const { magicItemId } = await params;
  return <MagicItemModal item={getMagicItemById(Number(magicItemId)) ?? null} />;
}
