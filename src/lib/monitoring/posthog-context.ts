import { hasNoAiPrefix, stripNoAiPrefix } from "@/lib/no-ai/no-ai-route";
import { stripDraftFragment } from "@/lib/utils/draft-fragment";

export function buildPostHogPageProperties(pathname: string, edition?: string) {
  const route = stripNoAiPrefix(pathname).replace(/^\/2024(?=\/|$)/, "") || "/";
  const section = route.split("/")[1] || "home";
  return {
    page_group: findPageGroup(route, section),
    edition: edition ?? (/^\/2024(?:\/|$)/.test(stripNoAiPrefix(pathname)) ? "2024" : "2014"),
    no_ai: hasNoAiPrefix(pathname),
    analytics_version: 2,
    environment: "production",
  };
}

function findPageGroup(route: string, section: string): string {
  if (/^\/(?:rules\/)?optimization(?:\/|$)/.test(route)) return "rpgbot";
  return section === "pers" ? "char" : section;
}

export function isInternalAnalyticsEmail(email: string | null | undefined, qaEmail = "qa-browser@char.holota.family"): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return normalized === "lukagolota1@gmail.com" || normalized === qaEmail?.trim().toLowerCase();
}

export function buildScreenProperties(width: number, height: number) {
  return { screen_size: `${width} × ${height}`, screen_width_group: width < 640 ? "<640" : width < 1024 ? "640–1023" : width < 1440 ? "1024–1439" : "≥1440" };
}

const PRIVATE_URL_PARAMS = ["persName", "q", "ph_ctx"];

export function stripPrivateUrlParams(href: string): string {
  const url = stripDraftFragment(href);
  if (!PRIVATE_URL_PARAMS.some((param) => url.includes(`${param}=`))) return url;
  try {
    const parsed = new URL(url);
    PRIVATE_URL_PARAMS.forEach((param) => parsed.searchParams.delete(param));
    return parsed.toString();
  } catch {
    return url;
  }
}
