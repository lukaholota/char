import { writeFile } from "node:fs/promises";
import { config } from "dotenv";
import { buildAnalyticsDashboards, type AnalyticsDashboard, type AnalyticsInsight } from "./posthog-dashboard-queries";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const HOST = "https://eu.posthog.com";
const PROJECT_ID = 245714;
const TAG = "char-analytics-v2";
const token = process.env.POSTHOG_TOKEN;
if (!token) throw new Error("POSTHOG_TOKEN is required (personal API key, never the public capture key)");

type ApiQuery = Record<string, unknown>;
type Insight = { id: number; short_id: string; name: string; query: ApiQuery; tags: string[]; dashboards: number[] };
type Tile = { id: number; insight: Insight | null; text: { body: string } | null; layouts: ApiQuery };
type Dashboard = { id: number; name: string; filters: ApiQuery; tiles: Tile[]; tags: string[] };
type Person = { id: string };

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`${HOST}/api/projects/${PROJECT_ID}/${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60_000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: HTTP ${response.status}: ${JSON.stringify(result).slice(0, 1200)}`);
  return result as T;
}

async function readAll<T>(path: string): Promise<T[]> {
  const results: T[] = [];
  let page: string | null = path;
  while (page) {
    const response: { results: T[]; next: string | null } = await request(page);
    if (!Array.isArray(response.results)) throw new Error(`Invalid list response for ${page}`);
    results.push(...response.results);
    page = response.next ? parseNextPage(response.next) : null;
  }
  return results;
}

function parseNextPage(next: string): string {
  const url = new URL(next);
  const prefix = `/api/projects/${PROJECT_ID}/`;
  if (url.origin !== HOST || !url.pathname.startsWith(prefix)) throw new Error("Unexpected pagination URL");
  return `${url.pathname.slice(prefix.length)}${url.search}`;
}

async function readInternalPersonIds(): Promise<string[]> {
  const accounts = await Promise.all([5, 967].map((id) => readAll<Person>(`persons/?distinct_id=${id}`)));
  if (accounts.some((persons) => persons.length !== 1)) throw new Error("Expected exactly one PostHog person per internal account");
  return accounts.flat().map((person) => person.id);
}

async function validateInsights(dashboards: AnalyticsDashboard[]): Promise<void> {
  for (const dashboard of dashboards) {
    for (const insight of dashboard.insights) {
      const result = await request<{ results?: unknown; error?: string }>("query/", "POST", { query: insight.query.source, refresh: "blocking" });
      if (result.error || result.results === undefined) throw new Error(`Query failed: ${insight.name}: ${result.error ?? "missing results"}`);
      console.log(`Validated: ${insight.name}`);
    }
  }
}

async function saveInsight(insight: AnalyticsInsight, dashboardId: number, existing: Insight[]): Promise<void> {
  const previous = existing.find((saved) => saved.tags.includes(TAG) && saved.name === insight.name);
  const body = { ...insight, tags: [TAG], dashboards: [...new Set([...(previous?.dashboards ?? []), dashboardId])] };
  await request(previous ? `insights/${previous.id}/` : "insights/", previous ? "PATCH" : "POST", body);
}

async function saveDashboard(definition: AnalyticsDashboard, existing: Dashboard[], insights: Insight[]): Promise<Dashboard> {
  const previous = existing.find((dashboard) => dashboard.tags.includes(TAG) && dashboard.name === definition.name);
  const body = { name: definition.name, description: definition.description, tags: [TAG], pinned: true };
  const dashboard = await request<Dashboard>(previous ? `dashboards/${previous.id}/` : "dashboards/", previous ? "PATCH" : "POST", body);
  await request(`dashboards/${dashboard.id}/`, "PATCH", { filters: { date_from: "-24h", date_to: null } });
  for (const insight of definition.insights) await saveInsight(insight, dashboard.id, insights);
  return arrangeDashboard(await request<Dashboard>(`dashboards/${dashboard.id}/`), definition);
}

async function arrangeDashboard(dashboard: Dashboard, definition: AnalyticsDashboard): Promise<Dashboard> {
  const orderedTiles = definition.insights.map((insight) => {
    const tile = dashboard.tiles.find((tile) => tile.insight?.name === insight.name);
    if (!tile) throw new Error(`Missing dashboard tile: ${insight.name}`);
    return tile;
  });
  const tiles = buildTileLayouts(orderedTiles);
  return request(`dashboards/${dashboard.id}/`, "PATCH", { tiles });
}

function buildTileLayouts(tiles: Tile[]): ApiQuery[] {
  let rowX = 0;
  let rowY = 0;
  let rowHeight = 0;
  let mobileY = 0;
  return tiles.map((tile) => {
    const source = tile.insight?.query.source as ApiQuery;
    const isNumber = (source.trendsFilter as ApiQuery | undefined)?.display === "BoldNumber";
    const isFunnel = source.kind === "FunnelsQuery";
    const w = isFunnel ? 12 : isNumber ? 3 : 6;
    const h = isFunnel ? 6 : isNumber ? 3 : 5;
    if (rowX + w > 12) { rowX = 0; rowY += rowHeight; rowHeight = 0; }
    const layouts = { sm: { x: rowX, y: rowY, w, h }, xs: { x: 0, y: mobileY, w: 1, h } };
    rowX += w;
    rowHeight = Math.max(rowHeight, h);
    mobileY += h;
    return { id: tile.id, layouts };
  });
}

async function applyDashboards(definitions: AnalyticsDashboard[], personIds: string[]): Promise<void> {
  for (const id of personIds) await request(`persons/${id}/`, "PATCH", { properties: { is_internal: true, $internal_or_test_user: true } });
  const existingDashboards = await readAll<Dashboard>("dashboards/?limit=100");
  const existingInsights = await readAll<Insight>("insights/?limit=100");
  for (const insight of existingInsights) {
    const source = insight.query?.source as ApiQuery | undefined;
    if (source && source.filterTestAccounts === false) {
      await request(`insights/${insight.id}/`, "PATCH", { query: { ...insight.query, source: { ...source, filterTestAccounts: true } } });
    }
  }
  const saved: Dashboard[] = [];
  for (const definition of definitions) {
    const dashboard = await saveDashboard(definition, existingDashboards, existingInsights);
    saved.push(dashboard);
    console.log(`Saved: ${definition.name}: ${HOST}/project/${PROJECT_ID}/dashboard/${dashboard.id}`);
  }
  await request("", "PATCH", { timezone: "Europe/Kyiv", test_account_filters_default_checked: true });
  await writeFile("docs/posthog-dashboards.json", JSON.stringify({ projectId: PROJECT_ID, host: HOST, timezone: "Europe/Kyiv", dashboards: saved.map((dashboard) => ({ id: dashboard.id, name: dashboard.name, url: `${HOST}/project/${PROJECT_ID}/dashboard/${dashboard.id}`, insights: dashboard.tiles.filter((tile) => tile.insight).map((tile) => ({ id: tile.insight!.id, name: tile.insight!.name })) })) }, null, 2) + "\n");
}

async function verifyDashboards(definitions: AnalyticsDashboard[]): Promise<void> {
  const saved = await readAll<Dashboard>("dashboards/?limit=100");
  for (const definition of definitions) {
    const match = saved.find((dashboard) => dashboard.tags.includes(TAG) && dashboard.name === definition.name);
    if (!match) throw new Error(`Missing dashboard: ${definition.name}`);
    const dashboard = await request<Dashboard>(`dashboards/${match.id}/`);
    if (dashboard.filters.date_from !== "-24h") throw new Error(`Unexpected date range: ${definition.name}`);
    for (const insight of definition.insights) {
      const savedInsight = dashboard.tiles.find((tile) => tile.insight?.name === insight.name)?.insight;
      if (!savedInsight || !matchesSavedQuery(savedInsight.query, insight.query)) {
        throw new Error(`Saved query differs: ${insight.name}`);
      }
    }
    console.log(`Verified: ${definition.name}, ${definition.insights.length} insights, last 24 hours`);
  }
}

// PostHog fills schema defaults on save; every field supplied by us must still match.
function matchesSavedQuery(actual: unknown, expected: unknown): boolean {
  if (Array.isArray(expected)) {
    return Array.isArray(actual) && actual.length === expected.length && expected.every((entry, index) => matchesSavedQuery(actual[index], entry));
  }
  if (expected !== null && typeof expected === "object") {
    if (actual === null || typeof actual !== "object") return false;
    return Object.entries(expected).every(([key, value]) => matchesSavedQuery((actual as ApiQuery)[key], value));
  }
  return actual === expected;
}

async function main(): Promise<void> {
  const mode = process.argv[2];
  if (!["validate", "apply", "verify"].includes(mode)) throw new Error("Usage: bun scripts/setup-posthog-dashboards.ts validate|apply|verify");
  const personIds = await readInternalPersonIds();
  const dashboards = buildAnalyticsDashboards(personIds);
  if (mode === "validate") await validateInsights(dashboards);
  if (mode === "apply") await applyDashboards(dashboards, personIds);
  if (mode === "verify") await verifyDashboards(dashboards);
}

await main();
