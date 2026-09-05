/**
 * Static bastion facility data for SSG pages and the 2024 catalog.
 *
 * Reads the generated JSON built by scripts/generate-bastions.ts.
 */

import bastionsJson from "./generated/bastions.json";
import { toEntitySlug } from "./slug-utils";
import type { BastionFacilityData, BastionHirelings, BastionOrder, BastionSpace } from "./bastion-facility";

export * from "./bastion-facility";

const facilities: BastionFacilityData[] = (bastionsJson as Array<Record<string, unknown>>).map(
  (facility) => ({
    slug: String(facility.slug),
    name: String(facility.name),
    engName: String(facility.nameEng),
    source: String(facility.source),
    page: (facility.page as number | null) ?? null,
    facilityType: facility.facilityType as "basic" | "special",
    level: (facility.level as number | null) ?? null,
    space: facility.space as BastionSpace[],
    hirelings: facility.hirelings as BastionHirelings[],
    orders: facility.orders as BastionOrder[],
    prerequisite: (facility.prerequisite as BastionFacilityData["prerequisite"]) ?? null,
    prerequisiteText: String(facility.prerequisiteText ?? ""),
    shortDescription: String(facility.shortDescription),
    description: String(facility.description),
  })
);

export function getAllBastionFacilities(): BastionFacilityData[] {
  return facilities;
}

export function getBastionFacilityBySlug(idOrSlug: string): BastionFacilityData | undefined {
  const trimmed = idOrSlug.trim();
  const slug = toEntitySlug(trimmed);
  return facilities.find(
    (facility) =>
      facility.slug === slug ||
      facility.engName.toLowerCase() === trimmed.toLowerCase() ||
      facility.name.toLowerCase() === trimmed.toLowerCase()
  );
}
