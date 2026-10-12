export function findCreatureReadingLink(href: string | undefined) {
  const match = /^(?:\/no-ai)?(\/2024)?\/bestiary(?:\/([a-z][a-z0-9-]*)|\?creature=([a-z][a-z0-9-]*))$/.exec(href ?? "");
  return match ? { key: match[2] ?? match[3], ruleset: match[1] ? "RULES_2024" as const : "RULES_2014" as const } : null;
}
