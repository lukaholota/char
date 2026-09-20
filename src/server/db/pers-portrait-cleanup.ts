import { prisma } from "@/lib/prisma";
import { deleteStoredImage } from "@/server/media/image-upload";

// Копія персонажа й знімки рівня посилаються на той самий файл — видаляти його можна лише останнім.
export async function isPortraitShared(portraitKey: string): Promise<boolean> {
  return (await prisma.pers.count({ where: { portraitKey } })) > 0;
}

export async function deleteUnusedPortraits(portraitKeys: (string | null)[]): Promise<void> {
  const uniqueKeys = [...new Set(portraitKeys.filter((key): key is string => Boolean(key)))];
  await Promise.all(uniqueKeys.map(async (key) => {
    if (!(await isPortraitShared(key))) await deleteStoredImage(key);
  }));
}
