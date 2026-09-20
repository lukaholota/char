import { getUserPersHomeData } from "@/lib/actions/pers";
import { CharHomeClient } from "@/app/char/home/CharHomeClient";
import { collectPersClassNames, collectPersSubclassNames } from "@/lib/logic/pers-class-names";
import { redirectKeepingNoAiMode } from "@/lib/no-ai/no-ai-server";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Персонажі — ДнД українською",
};

export default async function Page() {
  const { perses, folders, currentUserId } = await getUserPersHomeData({ ruleset: "RULES_2014" });

  if (perses.length === 0) {
    await redirectKeepingNoAiMode("/char/create");
  }

  const visibleFolderIds = new Set(folders.map((folder) => folder.folderId));

  const items = perses.map((pers) => ({
    persId: pers.persId,
    name: pers.name,
    portraitKey: pers.portraitKey,
    level: pers.level,
    currentHp: pers.currentHp,
    maxHp: pers.maxHp,
    raceName: pers.race.name,
    className: pers.class.name,
    backgroundName: pers.background.name,
    folderId: pers.folderId && visibleFolderIds.has(pers.folderId) ? pers.folderId : null,
    isPinned: pers.isPinned,
    isOwned: pers.userId === currentUserId,
    ruleset: pers.ruleset,
    classNames: collectPersClassNames(pers),
    subclassNames: collectPersSubclassNames(pers),
  }));

  return <CharHomeClient perses={items} folders={folders} ruleset="RULES_2014" rootHref="/char/home" createHref="/char/create" />;
}

