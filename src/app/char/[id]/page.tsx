import { notFound } from "next/navigation";
import CharacterSheetData from "@/app/char/[id]/sheet-data";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (isNaN(id)) notFound();

  // Скелет дає loading.tsx; другий Suspense тут додавав ще 300 мс затримки показу листа від React.
  return <CharacterSheetData id={id} />;
}
