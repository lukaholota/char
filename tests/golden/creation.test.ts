import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";
import { normalizeForGolden, readFullPers } from "../helpers/normalize-golden";
import { builds } from "../fixtures/builds";
import { withCreationSpells } from "../helpers/creation-spells";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";

const GOLDEN_DIR = path.join(__dirname, "creation");
const UPDATE_GOLDEN = process.env.UPDATE_GOLDEN === "1";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("KR2.2 — golden-тести createCharacter", () => {
  for (const build of builds) {
    it(`${build.id}: ${build.why}`, async () => {
      const user = await prisma.user.create({
        data: { email: `${build.id}@golden.test`, name: "Golden Test User" },
      });
      vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

      const form = await withCreationSpells(await build.form());
      const result = await createCharacter(form);

      if ("error" in result) {
        throw new Error(
          `createCharacter повернув помилку для білда "${build.id}": ${result.error}` +
            ("details" in result ? ` — ${JSON.stringify(result.details)}` : ""),
        );
      }

      const pers = await readFullPers(result.persId);
      const normalized = {
        ...normalizeForGolden(pers),
        ...(build.knownBugs?.length ? { KNOWN_BUGS: build.knownBugs } : {}),
      };

      const goldenPath = path.join(GOLDEN_DIR, `${build.id}.json`);
      if (UPDATE_GOLDEN || !fs.existsSync(goldenPath)) {
        fs.mkdirSync(GOLDEN_DIR, { recursive: true });
        fs.writeFileSync(goldenPath, JSON.stringify(normalized, null, 2) + "\n");
        return;
      }

      const golden = JSON.parse(fs.readFileSync(goldenPath, "utf-8"));
      expect(normalized).toEqual(golden);
    });
  }
});
