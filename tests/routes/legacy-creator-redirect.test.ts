import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, middleware } from "@/middleware";

describe("KR31.11 / L18-release-readiness-09 — стара адреса /char веде в конструктор", () => {
  it("middleware ловить /char: сторінки src/app/char/page.tsx більше немає", () => {
    expect(config.matcher).toContain("/char");
  });

  it("/char відповідає постійним редиректом на /char/create", () => {
    const response = middleware(new NextRequest("https://char.holota.family/char"));

    expect(response.status).toBe(308);
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/char/create");
  });
});
