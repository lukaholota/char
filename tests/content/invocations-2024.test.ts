import invocations from "../../data/2024/normalized/invocations.json";
import { expect, it } from "vitest";

it("містить Thirsting Blade і не залишає передумови на відсутні виклики", () => {
  const names = new Set(invocations.map((invocation) => invocation.engName));
  const thirstingBlade = invocations.find((invocation) => invocation.engName === "Thirsting Blade");
  const devouringBlade = invocations.find((invocation) => invocation.engName === "Devouring Blade");

  expect(thirstingBlade).toMatchObject({ minLevel: 5, pactRequirement: "Pact of the Blade" });
  expect(devouringBlade?.prerequisite).toContain("Thirsting Blade");
  expect(names.has("Thirsting Blade")).toBe(true);
});
