import { Skills } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { SKILL_KEYS } from "@/rules/feat-grants";

describe("надання риси: навички правил", () => {
  it("повторюють enum бази в тому самому порядку", () => {
    expect([...SKILL_KEYS]).toEqual(Object.values(Skills));
  });
});
