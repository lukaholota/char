import { hasNoAiPrefix, stripNoAiPrefix } from "@/lib/no-ai/no-ai-route";

export function buildPostHogPageProperties(pathname: string, edition?: string) {
  const route = stripNoAiPrefix(pathname).replace(/^\/2024(?=\/|$)/, "") || "/";
  const section = route.split("/")[1] || "home";
  return {
    page_group: section === "pers" ? "char" : section,
    edition: edition ?? (/^\/2024(?:\/|$)/.test(stripNoAiPrefix(pathname)) ? "2024" : "2014"),
    no_ai: hasNoAiPrefix(pathname),
    analytics_version: 2,
    environment: "production",
  };
}

export function isInternalAnalyticsEmail(email: string | null | undefined, qaEmail = "qa-browser@char.holota.family"): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return normalized === "lukagolota1@gmail.com" || normalized === qaEmail?.trim().toLowerCase();
}

export function buildScreenProperties(width: number, height: number) {
  return { screen_size: `${width} × ${height}`, screen_width_group: width < 640 ? "<640" : width < 1024 ? "640–1023" : width < 1440 ? "1024–1439" : "≥1440" };
}
