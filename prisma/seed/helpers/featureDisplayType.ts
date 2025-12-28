import { FeatureDisplayType, Prisma } from "@prisma/client";

export type SeedDisplayType = FeatureDisplayType | FeatureDisplayType[];

export type SeedFeatureCreateInput = Omit<Prisma.FeatureCreateInput, "displayType"> & {
    displayType?: SeedDisplayType;
};

function stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, "");
}

function deriveShortDescription(description: string): string {
    const text = stripHtml(description || "").trim();
    if (!text) return "";

    const firstLine = text.split(/\n+/)[0]?.trim() ?? "";
    const sentenceMatch = firstLine.match(/^(.+?[.!?])\s/);
    const base = (sentenceMatch?.[1] ?? firstLine).trim();

    const limit = 100;
    if (base.length <= limit) return base;
    return base.slice(0, limit - 1).trimEnd() + "…";
}

export function normalizeFeatureCreateInput(input: SeedFeatureCreateInput): Prisma.FeatureCreateInput {
    const raw = input.displayType;

    const displayType = Array.isArray(raw)
        ? raw
        : raw
            ? [raw]
            : [FeatureDisplayType.PASSIVE];

    const existingShort = (input as any).shortDescription as string | null | undefined;
    const description = String((input as any).description ?? "");
    const shortDescription = (existingShort ?? "").trim() ? existingShort : deriveShortDescription(description) || null;

    return {
        ...input,
        displayType,
        shortDescription,
    };
}
