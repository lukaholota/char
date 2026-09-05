import { getUserPersHomeData } from "@/lib/actions/pers";
import { CharHomeClient } from "@/app/char/home/CharHomeClient";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Персонажі (2024) — ДнД українською",
};

export default async function Page() {
  const { perses, folders } = await getUserPersHomeData({ ruleset: "RULES_2024" });

  if (perses.length === 0) {
    redirect("/2024/char");
  }

  const visibleFolderIds = new Set(folders.map((folder) => folder.folderId));

  const items = perses.map((pers) => ({
    persId: pers.persId,
    name: pers.name,
    level: pers.level,
    currentHp: pers.currentHp,
    maxHp: pers.maxHp,
    raceName: pers.race.name,
    className: pers.class.name,
    backgroundName: pers.background.name,
    folderId: pers.folderId && visibleFolderIds.has(pers.folderId) ? pers.folderId : null,
    isPinned: pers.isPinned,
    ruleset: pers.ruleset,
    classNames: [
      pers.class?.name,
      ...(pers.multiclasses ?? []).map((mc) => mc.class?.name),
    ]
      .filter(Boolean)
      .map((name) => String(name)),
    subclassNames: [
      pers.subclass?.name,
      ...(pers.multiclasses ?? []).map((mc) => mc.subclass?.name),
    ]
      .filter(Boolean)
      .map((name) => String(name)),
  }));

  return <CharHomeClient perses={items} folders={folders} rootHref="/2024/char/home" createHref="/2024/char" />;
}
