import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const headerStore = new Map<string, string>();
const redirectCalls: string[] = [];

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => headerStore.get(name) ?? null }),
}));

vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    redirectCalls.push(href);
    throw new Error("NEXT_REDIRECT");
  },
}));

const { isNoAiRequest, redirectKeepingNoAiMode } = await import("@/lib/no-ai/no-ai-server");

const appDir = path.join(process.cwd(), "src", "app");

function collectAppSources(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectAppSources(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

function importsRedirectFromNavigation(source: string): boolean {
  const imported = source.match(/import \{([^}]*)\} from "next\/navigation"/)?.[1] ?? "";
  return /\bredirect\b/.test(imported);
}

async function catchRedirect(href: string): Promise<string> {
  redirectCalls.length = 0;
  await expect(redirectKeepingNoAiMode(href)).rejects.toThrow("NEXT_REDIRECT");
  return redirectCalls[0];
}

describe("Режим без ШІ — серверний редирект", () => {
  beforeEach(() => {
    headerStore.clear();
  });

  it("бачить режим лише за заголовком, бо переписаний шлях його вже не несе", async () => {
    expect(await isNoAiRequest()).toBe(false);
    headerStore.set("x-no-ai", "1");
    expect(await isNoAiRequest()).toBe(true);
  });

  it("у режимі без ШІ веде на адресу з сегментом", async () => {
    headerStore.set("x-no-ai", "1");
    expect(await catchRedirect("/char/create")).toBe("/no-ai/char/create");
    expect(await catchRedirect("/2024/char")).toBe("/no-ai/2024/char");
    expect(await catchRedirect("/spells/12")).toBe("/no-ai/spells/12");
  });

  it("у звичайному режимі лишає адресу як є", async () => {
    expect(await catchRedirect("/char/create")).toBe("/char/create");
  });
});

describe("Режим без ШІ — жодного редиректу повз режим", () => {
  it("сторінки не кличуть redirect напряму, інакше редирект викидає з режиму", () => {
    const offenders = collectAppSources(appDir)
      .filter((file) => importsRedirectFromNavigation(fs.readFileSync(file, "utf8")))
      .map((file) => path.relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });
});
