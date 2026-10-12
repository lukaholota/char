/** Supplemental descriptions have no saved catalogue entity ID. */
export function readingReferenceHref(href: string): string {
  const match = /^\/(classes|races|feats|equipment)\?reference=([a-z0-9-]+)$/.exec(href);
  return match ? `/rules/features/${match[1]}/${match[2]}` : href;
}
