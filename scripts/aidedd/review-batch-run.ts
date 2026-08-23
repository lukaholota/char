#!/usr/bin/env bun
// Розбирає stream-json одного headless-прогону партії: друкує підсумок агента у лог і
// перевіряє, чи не виліз агент за свою смугу. Чужі файли рахуються з його ж tool-викликів,
// а не з `git status`, бо в репо паралельно працюють інші сесії.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";

const ALLOWED_PATHS = [
  "data/aidedd/",
  "src/lib/generated/creatures.json",
  "src/lib/refs/dictionary.json",
  "tests/content/bestiary-2014-import.test.ts",
  "tests/content/bestiary-import.test.ts",
  "docs/o12-srd-2024-import/",
  "docs/README.md",
];

// Промпт партії дозволяє тут малу композицію вже затвердженого (новий слот TranslatedFields,
// новий регекс-кейс джерела). Стоп на цьому зупиняв би роботу, тож — попередження, не смуга.
const REVIEWABLE_PATHS = [
  "scripts/aidedd/build-creature-record.ts",
  "scripts/aidedd/scan-batch.ts",
];

const EDIT_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
const MUTATING_GIT_SUBCOMMANDS = new Set([
  "commit",
  "push",
  "reset",
  "checkout",
  "switch",
  "restore",
  "rebase",
  "merge",
  "cherry-pick",
  "revert",
  "apply",
]);
const READ_ONLY_STASH_ARGS = new Set(["list", "show"]);
const GIT_GLOBAL_OPTIONS_WITH_VALUE = new Set(["-C", "-c", "--git-dir", "--work-tree"]);
const COMMAND_SEPARATORS = /\|\||&&|;|\n|\|/;

// Партія має право читати історію — стоп лише на тому, що змінює дерево чи віддалене репо.
const BATCH_OWN_TESTS = ["tests/content/bestiary-2014-import.test.ts"];

type ToolUse = { type: string; name?: string; input?: Record<string, unknown> };
type RunEvent = { type: string; message?: { content?: ToolUse[] }; result?: string };

function main(): void {
  const eventsPath = process.argv[2];
  if (!eventsPath) {
    console.error("вкажи шлях до stream-json прогону");
    process.exit(2);
  }

  const events = readEvents(eventsPath);
  printFinalAnswer(events);

  const editedPaths = collectEditedPaths(events);
  const scratchPaths = findScratchPaths(editedPaths);
  const versionedPaths = editedPaths.filter((path) => !scratchPaths.includes(path));

  const strayPaths = versionedPaths
    .filter((path) => !isInsideAllowedLane(path))
    .filter((path) => !REVIEWABLE_PATHS.includes(path));
  const secretPaths = editedPaths.filter(isSecretFile);
  const strayCommands = collectForbiddenCommands(events);

  printEditedFiles(versionedPaths, scratchPaths.length);
  warnAboutEditedTests(versionedPaths);
  warnAboutEditedTooling(versionedPaths);

  if (strayPaths.length === 0 && secretPaths.length === 0 && strayCommands.length === 0) return;

  printViolations(strayPaths, secretPaths, strayCommands);
  process.exit(1);
}

function readEvents(path: string): RunEvent[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as RunEvent);
}

function collectToolUses(events: RunEvent[]): ToolUse[] {
  return events
    .filter((event) => event.type === "assistant")
    .flatMap((event) => event.message?.content ?? [])
    .filter((block) => block.type === "tool_use");
}

function collectEditedPaths(events: RunEvent[]): string[] {
  const paths = collectToolUses(events)
    .filter((tool) => EDIT_TOOLS.has(tool.name ?? ""))
    .map((tool) => tool.input?.file_path)
    .filter((path): path is string => typeof path === "string")
    .map((path) => relative(process.cwd(), resolve(path)))
    .filter((path) => !path.startsWith(".."));

  return [...new Set(paths)].sort();
}

function collectForbiddenCommands(events: RunEvent[]): string[] {
  const commands = collectToolUses(events)
    .filter((tool) => tool.name === "Bash")
    .map((tool) => tool.input?.command)
    .filter((command): command is string => typeof command === "string")
    .flatMap((command) => command.split(COMMAND_SEPARATORS))
    .map((segment) => segment.trim())
    .filter(isMutatingGitCommand);

  return [...new Set(commands)];
}

function isMutatingGitCommand(segment: string): boolean {
  const tokens = segment.split(/\s+/).filter((token) => token.length > 0);
  const gitIndex = tokens.findIndex((token) => token === "git");
  if (gitIndex === -1) return false;
  if (gitIndex > 0 && tokens[gitIndex - 1] !== "sudo") return false;

  const args = dropGitGlobalOptions(tokens.slice(gitIndex + 1));
  const [subcommand, ...rest] = args;
  if (!subcommand) return false;
  if (rest.includes("--dry-run")) return false;

  if (subcommand === "stash") return !READ_ONLY_STASH_ARGS.has(rest[0] ?? "");
  if (subcommand === "clean") return !rest.includes("-n");
  return MUTATING_GIT_SUBCOMMANDS.has(subcommand);
}

function dropGitGlobalOptions(args: string[]): string[] {
  let index = 0;
  while (index < args.length && args[index].startsWith("-")) {
    index += GIT_GLOBAL_OPTIONS_WITH_VALUE.has(args[index]) ? 2 : 1;
  }
  return args.slice(index);
}

// Чернетки під `tmp/` і логи git не веде — вони не «чужі файли», а робочий стіл партії.
// Файл `tmp-щось` у корені git ігнорувати нічим, але це та сама чернетка, не правка репо.
function findScratchPaths(paths: string[]): string[] {
  const ignored = findGitIgnoredPaths(paths);
  const rootDrafts = paths.filter((path) => /^tmp[-.]/.test(path));
  return [...new Set([...ignored, ...rootDrafts])];
}

function findGitIgnoredPaths(paths: string[]): string[] {
  if (paths.length === 0) return [];

  const check = spawnSync("git", ["check-ignore", "--stdin"], {
    input: paths.join("\n"),
    encoding: "utf8",
  });

  return check.stdout.split("\n").filter((path) => path.length > 0);
}

function isInsideAllowedLane(path: string): boolean {
  return ALLOWED_PATHS.some((prefix) => path === prefix || path.startsWith(prefix));
}

function isSecretFile(path: string): boolean {
  return basename(path).startsWith(".env");
}

function printFinalAnswer(events: RunEvent[]): void {
  const answer = events.find((event) => event.type === "result")?.result;
  if (answer) console.log(answer);
}

function printEditedFiles(versionedPaths: string[], scratchCount: number): void {
  const scratchNote = scratchCount > 0 ? ` (+${scratchCount} чернеток поза git)` : "";
  console.log(`\nАгент редагував ${versionedPaths.length} файлів у репо${scratchNote}:`);
  for (const path of versionedPaths) console.log(`  ${path}`);
}

function warnAboutEditedTests(versionedPaths: string[]): void {
  const testPaths = versionedPaths
    .filter((path) => path.endsWith(".test.ts"))
    .filter((path) => !BATCH_OWN_TESTS.includes(path));
  if (testPaths.length === 0) return;
  console.error(`⚠ партія правила тести: ${testPaths.join(", ")} — глянь, що саме`);
}

function warnAboutEditedTooling(versionedPaths: string[]): void {
  const toolingPaths = versionedPaths.filter((path) => REVIEWABLE_PATHS.includes(path));
  if (toolingPaths.length === 0) return;
  console.error(`⚠ партія правила інструменти: ${toolingPaths.join(", ")} — глянь, що саме`);
}

function printViolations(
  strayPaths: string[],
  secretPaths: string[],
  strayCommands: string[],
): void {
  for (const path of strayPaths) console.error(`✖ файл поза смугою партії: ${path}`);
  for (const path of secretPaths) console.error(`✖ агент писав у секрети: ${path}`);
  for (const command of strayCommands) console.error(`✖ заборонена команда: ${command}`);
}

main();
