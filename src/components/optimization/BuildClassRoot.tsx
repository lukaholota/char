"use client";

import { ContentImage, useIsArtHidden } from "@/components/no-ai/ContentImage";
import { findEditionAccent } from "@/styles/edition-accent";

export function BuildClassRoot({ characterClass, chosen, edition, onChoose }: {
  characterClass: { name: string; imageSrc: string | null }; chosen: boolean;
  edition: "2014" | "2024"; onChoose: () => void;
}) {
  const hiddenArt = useIsArtHidden(characterClass.imageSrc);
  const accent = findEditionAccent(edition).solid;
  return <button type="button" aria-pressed={chosen} onClick={onChoose} className="flex min-h-11 flex-col items-center gap-3">
    {!hiddenArt && characterClass.imageSrc ? <span className={`relative block h-28 w-28 overflow-hidden rounded-full border-2 shadow-xl sm:h-36 sm:w-36 ${chosen ? accent.border : "border-white/20"}`}>
      <ContentImage src={characterClass.imageSrc} alt="" fill sizes="144px" className="object-cover" />
    </span> : null}
    <span className="font-rpg-display text-xl text-white">{characterClass.name}</span>
  </button>;
}
