import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { findSweptTextDrift } from "../../prisma/seed/sweptTermText2014";

/// Зведений текст 2014 їде за білим списком імен. Імʼя, якого немає в сідах, робить прохід
/// невиконуваним — тут це видно без бази.
function buildEmptyDatabase(): PrismaClient {
  return {
    feature: { findUnique: async () => null },
    subclass: { findMany: async () => [] },
  } as unknown as PrismaClient;
}

describe("білий список зведеного тексту 2014", () => {
  it("кожне імʼя знаходиться в сідах фіч підкласів, вливань і рас", async () => {
    await expect(findSweptTextDrift(buildEmptyDatabase())).resolves.toEqual([]);
  });
});
