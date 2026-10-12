import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export function findRoutePagePath(routeDir: string): string | null {
  if (!existsSync(routeDir)) return null;
  const routeGroups = readdirSync(routeDir).filter((name) => /^\(.+\)$/.test(name));
  return ["", ...routeGroups].map((group) => join(routeDir, group, "page.tsx")).find((path) => existsSync(path)) ?? null;
}
