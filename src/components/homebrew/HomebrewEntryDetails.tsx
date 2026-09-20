"use client";

import { Link2 } from "lucide-react";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { Button } from "@/components/ui/button";
import type { HomebrewCatalogEntry } from "@/lib/logic/homebrew-view";
import { HomebrewAddToPersButton } from "./HomebrewAddToPersButton";
import { HomebrewEntryActions } from "./HomebrewEntryActions";

type EntryRef = Pick<HomebrewCatalogEntry, "entryId" | "kind" | "edition" | "authorName" | "canEdit">;

export function HomebrewByline({ entry }: { entry: EntryRef }) {
  return (
    <p className="text-sm text-slate-400">
      Хоумбрю {describeEdition(entry.edition)} від <span className="font-semibold text-slate-200">{entry.authorName}</span>. Не офіційний
      вміст — перш ніж брати за стіл, узгодьте з майстром.
    </p>
  );
}

export function HomebrewEntryButtons({ entry, pageHref }: { entry: EntryRef; pageHref?: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {entry.kind === "SPELL" ? <HomebrewAddToPersButton entryId={entry.entryId} edition={entry.edition} /> : null}
      {entry.canEdit ? <HomebrewEntryActions entryId={entry.entryId} /> : null}
      {pageHref ? (
        <Button asChild variant="ghost" className="h-11 gap-2 text-slate-300 sm:h-9">
          <Link href={pageHref}>
            <Link2 className="h-4 w-4" />
            Посилання на запис
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

function describeEdition(edition: HomebrewCatalogEntry["edition"]): string {
  if (edition === "ANY") return "для обох редакцій";
  return edition === "RULES_2024" ? "2024" : "2014";
}
