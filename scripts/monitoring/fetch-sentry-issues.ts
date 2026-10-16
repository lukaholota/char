import * as dotenv from "dotenv";
import { writeFileSync } from "fs";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const SENTRY_HOST = "https://de.sentry.io";
const ORG = "char-da";
const PROJECT = "javascript-nextjs";
const STATS_PERIOD = "30d";
const SNAPSHOT_PATH = "docs/o21-user-signals/inbox/sentry-issues.json";

const KEPT_FIELDS = [
  "id",
  "shortId",
  "title",
  "culprit",
  "level",
  "count",
  "userCount",
  "firstSeen",
  "lastSeen",
  "permalink",
  "metadata",
] as const;

type SentryIssue = Record<string, unknown> & {
  project?: { slug?: string };
  lifetime?: { firstSeen?: string; lastSeen?: string };
};

function readToken() {
  const token = process.env.SENTRY_READ_TOKEN ?? process.env.SENTRY_TOKEN;

  if (!token) {
    throw new Error(
      "Немає SENTRY_READ_TOKEN (або SENTRY_TOKEN) у .env — див. docs/o21-user-signals/kr21.1-sentry-triage.md, крок 1",
    );
  }

  return token;
}

function findNextCursor(linkHeader: string | null) {
  if (!linkHeader) return null;

  const nextLink = linkHeader
    .split(",")
    .find((part) => part.includes('rel="next"') && part.includes('results="true"'));

  return nextLink?.match(/cursor="([^"]+)"/)?.[1] ?? null;
}

// Проєктний ендпоінт приймає statsPeriod лише '', 24h або 14d; 30 днів дає тільки організаційний.
async function fetchIssuePage(token: string, cursor: string | null) {
  const url = new URL(`${SENTRY_HOST}/api/0/organizations/${ORG}/issues/`);
  url.searchParams.set("project", "-1");
  url.searchParams.set("query", "is:unresolved");
  url.searchParams.set("statsPeriod", STATS_PERIOD);
  url.searchParams.set("limit", "100");
  if (cursor) url.searchParams.set("cursor", cursor);

  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (!response.ok) {
    throw new Error(`Sentry ${response.status}: ${await response.text()}`);
  }

  return {
    issues: (await response.json()) as SentryIssue[],
    nextCursor: findNextCursor(response.headers.get("link")),
  };
}

async function collectUnresolvedIssues(token: string) {
  const collected: SentryIssue[] = [];
  let cursor: string | null = null;

  do {
    const page = await fetchIssuePage(token, cursor);
    collected.push(...page.issues);
    cursor = page.nextCursor;
  } while (cursor);

  return collected;
}

function isFromProject(issue: SentryIssue) {
  return issue.project?.slug === PROJECT;
}

// `count` і `userCount` — за вікно. Верхні `firstSeen`/`lastSeen` теж обрізані вікном і зсуваються
// разом із ним, тому дати беруться з `lifetime`.
function stripToKeptFields(issue: SentryIssue) {
  const fields: Record<string, unknown> = {
    ...issue,
    firstSeen: issue.lifetime?.firstSeen ?? issue.firstSeen,
    lastSeen: issue.lifetime?.lastSeen ?? issue.lastSeen,
  };

  return Object.fromEntries(KEPT_FIELDS.map((field) => [field, fields[field] ?? null]));
}

function sortById(issues: ReturnType<typeof stripToKeptFields>[]) {
  return [...issues].sort((left, right) => Number(left.id) - Number(right.id));
}

async function main() {
  const issues = await collectUnresolvedIssues(readToken());
  const snapshot = sortById(issues.filter(isFromProject).map(stripToKeptFields));

  writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`${snapshot.length} unresolved issue за ${STATS_PERIOD} → ${SNAPSHOT_PATH}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
