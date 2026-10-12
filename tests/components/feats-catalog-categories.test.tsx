// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FeatsClient } from "@/components/feats/FeatsClient";
import { getAllFeats } from "@/lib/featsData";

afterEach(cleanup);

it("hides feat categories in the 2014 catalog, where feats have none", () => {
  expect(getAllFeats("RULES_2014").every((feat) => !feat.category)).toBe(true);
  render(<FeatsClient feats={getAllFeats("RULES_2014")} ruleset="RULES_2014" />);
  expect(screen.queryByRole("button", { name: "Бойові стилі" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Всі" })).toBeNull();
});

it("keeps the category tabs in the 2024 catalog", () => {
  render(<FeatsClient feats={getAllFeats("RULES_2024")} ruleset="RULES_2024" />);
  expect(screen.getByRole("button", { name: "Бойові стилі" })).toBeTruthy();
});
