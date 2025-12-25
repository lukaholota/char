import { FeatureDisplayType, Prisma } from "@prisma/client";

export type SeedDisplayType = FeatureDisplayType | FeatureDisplayType[];

export type SeedFeatureCreateInput = Omit<Prisma.FeatureCreateInput, "displayType"> & {
    displayType?: SeedDisplayType;
};

export function normalizeFeatureCreateInput(input: SeedFeatureCreateInput): Prisma.FeatureCreateInput {
    const raw = input.displayType;

    const displayType = Array.isArray(raw)
        ? raw
        : raw
            ? [raw]
            : [FeatureDisplayType.PASSIVE];

    return {
        ...input,
        displayType,
    };
}
