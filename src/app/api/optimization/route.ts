import { NextResponse } from "next/server";
import { z } from "zod";
import { isCurrentUserSiteOwner } from "@/server/db/current-user";
import { readHydratedSliceArticle, readSlicePreview } from "@/lib/optimization/slice-reader";
import { idSchema, rulesetSchema } from "@/lib/optimization/schema";

const querySchema = z.discriminatedUnion("view", [
  z.object({ view: z.literal("preview"), ruleset: rulesetSchema, classKey: idSchema, subclassKey: idSchema }),
  z.object({ view: z.literal("article"), ruleset: rulesetSchema, slug: idSchema }),
]);
const HEADERS = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" };

export async function GET(request: Request) {
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if ((!query.success || query.data.ruleset !== "RULES_2014") && !(await isCurrentUserSiteOwner()))
    return new NextResponse(null, { status: 404, headers: HEADERS });
  if (!query.success) return new NextResponse(null, { status: 400, headers: HEADERS });
  const params = query.data;
  try {
    const data = params.view === "article"
      ? await readHydratedSliceArticle(params.slug, params.ruleset)
      : await readSlicePreview({ ruleset: params.ruleset, kind: "subclass", parentKey: params.classKey, entityKey: params.subclassKey });
    return NextResponse.json(data, { headers: HEADERS });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new NextResponse(null, { status: 404, headers: HEADERS });
    throw error;
  }
}
