import { Ruleset } from "./types";
import { isRules2024Allowed } from "./access";
import { addNoAiPrefix, hasNoAiPrefix, stripNoAiPrefix } from "@/lib/no-ai/no-ai-route";

export type Edition = "2014" | "2024";

const LEGACY_CREATOR_PATH = "/char";

const CREATOR_PATH_BY_EDITION: Record<Edition, string> = {
  "2014": "/char/create",
  "2024": "/2024/char",
};

/**
 * Returns the active ruleset / edition from a URL pathname.
 */
export function getEditionFromPathname(pathname: string): Edition {
  if (pathname === "/2024" || pathname.startsWith("/2024/")) {
    return "2024";
  }
  return "2014";
}

/**
 * Returns the Prisma Ruleset enum value from a URL pathname.
 */
export function getRulesetFromPathname(pathname: string): Ruleset {
  return getEditionFromPathname(pathname) === "2024" ? "RULES_2024" : "RULES_2014";
}

/**
 * Converts a pathname to the counterpart in the target edition.
 * E.g.:
 * - getTargetEditionPath("/spells", "2024") -> "/2024/spells"
 * - getTargetEditionPath("/2024/spells", "2014") -> "/spells"
 * - getTargetEditionPath("/", "2024") -> "/2024"
 * - getTargetEditionPath("/2024", "2014") -> "/"
 */
export function getTargetEditionPath(pathname: string, targetEdition: Edition): string {
  const currentEdition = getEditionFromPathname(pathname);
  if (currentEdition === targetEdition) {
    return pathname;
  }

  if (isCreatorPath(pathname, currentEdition)) {
    return CREATOR_PATH_BY_EDITION[targetEdition];
  }

  if (targetEdition === "2024") {
    if (pathname === "/") return "/2024";
    return `/2024${pathname}`;
  }

  // Target is 2014
  if (pathname === "/2024" || pathname === "/2024/") return "/";
  if (pathname.startsWith("/2024/")) {
    return pathname.slice(5) || "/";
  }

  return pathname;
}

function isCreatorPath(pathname: string, edition: Edition): boolean {
  return pathname === CREATOR_PATH_BY_EDITION[edition];
}

export function resolveLegacyCreatorRedirect(pathname: string): string | null {
  if (stripNoAiPrefix(pathname) !== LEGACY_CREATOR_PATH) return null;
  const target = CREATOR_PATH_BY_EDITION["2014"];
  return hasNoAiPrefix(pathname) ? addNoAiPrefix(target) : target;
}

/**
 * Helper to determine the counterpart fallback path for unauthorized 2024 access.
 */
export function get2014FallbackPath(pathname: string): string {
  return getTargetEditionPath(pathname, "2014");
}

/**
 * Access check helper for server components / routes.
 */
export function canAccess2024Route(): boolean {
  return isRules2024Allowed();
}
