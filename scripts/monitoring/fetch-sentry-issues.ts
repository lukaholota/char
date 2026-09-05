import * as dotenv from "dotenv";
import { writeFileSync } from "fs";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const SENTRY_HOST = "https://de.sentry.io";
const ORG = "char-da";
const PROJECT = "javascript-nextjs";
const SNAPSHOT_PATH = "docs/o21-user-signals/inbox/sentry-issues.json";

const KEPT_FIELDS = [
  "id",
  "shortId",
  "title",
  "culprit",
  "level",
  "status",
  "count",
  "userCount",
  "firstSeen",
  "lastSeen",
  "permalink",
  "metadata",
] as const;

type SentryIssue = Record<string, unknown>;

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

async function fetchIssuePage(token: string, cursor: string | null) {
  const url = new URL(`${SENTRY_HOST}/api/0/projects/${ORG}/${PROJECT}/issues/`);
  url.searchParams.set("query", "");
  url.searchParams.set("statsPeriod", "");
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

async function collectAllIssues(token: string) {
  const collected: SentryIssue[] = [];
  let cursor: string | null = null;

  do {
    const page = await fetchIssuePage(token, cursor);
    collected.push(...page.issues);
    cursor = page.nextCursor;
  } while (cursor);

  return collected;
}

function stripToKeptFields(issue: SentryIssue) {
  return Object.fromEntries(KEPT_FIELDS.map((field) => [field, issue[field] ?? null]));
}

function sortByLastSeenDesc(issues: ReturnType<typeof stripToKeptFields>[]) {
  return [...issues].sort((left, right) => {
    const byLastSeen = String(right.lastSeen).localeCompare(String(left.lastSeen));

    return byLastSeen !== 0 ? byLastSeen : String(left.id).localeCompare(String(right.id));
  });
}

async function main() {
  const issues = await collectAllIssues(readToken());
  const snapshot = sortByLastSeenDesc(issues.map(stripToKeptFields));

  writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`${snapshot.length} issue → ${SNAPSHOT_PATH}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
