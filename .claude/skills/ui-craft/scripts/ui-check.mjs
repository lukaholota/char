#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SOURCE_FILE = /\.(tsx|ts|css)$/;
const MAX_PRINTED = 40;

const IDENTITY_ANY_LINE = new Set(["src/styles/palette.ts", "src/styles/edition-accent.ts"]);
const IDENTITY_FONT_LINES = new Set(["src/app/layout.tsx", "src/app/globals.css", "tailwind.config.ts"]);

const LINE_RULES = [
  { id: "tiny-text", hint: "phone text must be ≥12px", test: (text) => /text-\[(?:\d|1[01])(?:\.\d+)?px\]/.test(text) },
  { id: "outline-none", hint: "pair it with a focus-visible style", test: (text) => /\boutline-none\b/.test(text) && !/focus-visible:/.test(text) },
  { id: "raw-hex", hint: "use palette/accent tokens", test: (text, file) => file.endsWith(".tsx") && /#[0-9a-fA-F]{3,8}\b/.test(text) },
  { id: "viewport-height", hint: "use dvh/svh", test: (text) => /\b(h-screen|min-h-screen|100vh)\b/.test(text) },
  { id: "transition-all", hint: "transition only the properties that change", test: (text) => /\btransition-all\b|transition:\s*all/.test(text) },
  { id: "motion", hint: "motion is off by default — owner decides", test: (text) => /from ["']framer-motion["']|@keyframes|\banimate-(?!none\b)[a-z]|<motion\./.test(text) },
  { id: "icon-button-label", hint: "icon-only button needs aria-label", test: (text) => /size=["']icon["']/.test(text) && !/aria-label/.test(text) },
  { id: "img-dimensions", hint: "set width and height", test: (text) => /<img\b/.test(text) && !/\b(width|height)=/.test(text) },
  { id: "dead-duplicate", hint: "import from @/components/ui", test: (text) => /@\/lib\/components\/ui\/(dialog|card)["']/.test(text) },
  { id: "swiper-no-swiping", hint: "breaks sheet gestures — docs/WORKFLOWS.md#ui-and-browser-checks", test: (text) => /swiper-no-swiping/.test(text) },
];

function main() {
  const scope = process.argv.slice(2);
  const addedLines = collectAddedLines(scope.length > 0 ? scope : ["src"]);
  const findings = [
    ...findLineRuleHits(addedLines),
    ...findIdentityEdits(collectAddedLines([...IDENTITY_ANY_LINE, ...IDENTITY_FONT_LINES])),
    ...findNewDependencies(collectAddedLines(["package.json"])),
  ];
  printReport(findings, addedLines.length);
}

function runGit(args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function collectAddedLines(paths) {
  return [...readDiffAddedLines(paths), ...readUntrackedLines(paths)];
}

function readDiffAddedLines(paths) {
  const added = [];
  let file = null;
  let lineNumber = 0;
  for (const raw of runGit(["diff", "-U0", "HEAD", "--", ...paths]).split("\n")) {
    if (raw.startsWith("+++ ")) {
      file = raw === "+++ /dev/null" ? null : raw.replace(/^\+\+\+ b\//, "");
      continue;
    }
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      lineNumber = Number(hunk[1]);
      continue;
    }
    if (file && raw.startsWith("+")) {
      added.push({ file, line: lineNumber, text: raw.slice(1) });
      lineNumber += 1;
    }
  }
  return added;
}

function readUntrackedLines(paths) {
  const files = runGit(["ls-files", "--others", "--exclude-standard", "--", ...paths])
    .split("\n")
    .filter((file) => SOURCE_FILE.test(file) || file === "package.json");
  return files.flatMap((file) =>
    readFileSync(file, "utf8").split("\n").map((text, index) => ({ file, line: index + 1, text })),
  );
}

function findLineRuleHits(addedLines) {
  return addedLines
    .filter(({ file }) => SOURCE_FILE.test(file) && !file.startsWith("src/lib/generated/") && !/\.test\.[jt]sx?$/.test(file))
    .flatMap(({ file, line, text }) =>
      LINE_RULES.filter((rule) => rule.test(text, file)).map((rule) => ({ file, line, rule: rule.id, hint: rule.hint })),
    );
}

function findIdentityEdits(addedLines) {
  return addedLines
    .filter(({ file, text }) => IDENTITY_ANY_LINE.has(file) || (IDENTITY_FONT_LINES.has(file) && /font/i.test(text)))
    .map(({ file, line }) => ({ file, line, rule: "identity", hint: "palette/accent/font change — ask the owner first" }));
}

function findNewDependencies(addedLines) {
  return addedLines
    .filter(({ text }) => /^\s*"[@a-z0-9/._-]+":\s*"[\^~]?\d/.test(text))
    .map(({ file, line, text }) => ({ file, line, rule: "dependency", hint: `new dependency ${text.trim()} — can existing code cover it?` }));
}

function printReport(findings, scannedLineCount) {
  if (findings.length === 0) {
    console.log(`ui-check: clean (${scannedLineCount} added lines scanned)`);
    return;
  }
  for (const finding of findings.slice(0, MAX_PRINTED)) {
    console.log(`${finding.file}:${finding.line}  ${finding.rule} — ${finding.hint}`);
  }
  if (findings.length > MAX_PRINTED) console.log(`… ${findings.length - MAX_PRINTED} more`);
  const fileCount = new Set(findings.map((finding) => finding.file)).size;
  console.log(`ui-check: ${findings.length} findings in ${fileCount} files`);
}

main();
