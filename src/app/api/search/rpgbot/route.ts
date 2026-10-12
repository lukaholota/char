import { NextResponse } from "next/server";
import { searchRpgbotSections } from "@/server/search/rpgbot-search";
import { rpgbotSearchRequestSchema } from "@/lib/search/rpgbot-search-schema";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const parsed = rpgbotSearchRequestSchema.safeParse({ query: searchParams.get("q") ?? "", ruleset: searchParams.get("ruleset") ?? "RULES_2014" });
  if (!parsed.success) return NextResponse.json({ error: "Invalid search query" }, { status: 400 });
  return NextResponse.json(await searchRpgbotSections(parsed.data.query, parsed.data.ruleset));
}
