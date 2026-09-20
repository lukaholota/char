// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { CreationStepRuleLink } from "@/lib/components/characterCreator/CreationStepRuleLink";
import { collectCreationStepRuleExcerpts } from "@/lib/content/creation-step-rule-excerpts";

afterEach(cleanup);

const EXCERPTS = collectCreationStepRuleExcerpts();

/// Початок статті читається модалкою просто на кроці: майстер створення заповнений, і
/// перехід у довідник новою вкладкою коштував би гравцеві місця в майстрі.
describe("початок статті довідника на кроці майстра створення", () => {
  it("кнопка кроку майстерності зброї відкриває початок правила й веде на повну статтю", () => {
    render(<CreationStepRuleLink stepId="weaponMastery" ruleset="RULES_2024" excerpts={EXCERPTS} />);

    expect(screen.queryByTestId("creation-step-rule-dialog")).toBeNull();
    fireEvent.click(screen.getByTestId("creation-step-rule-link"));

    const dialog = screen.getByTestId("creation-step-rule-dialog");
    expect(dialog.textContent).toContain("Властивості майстерності");
    expect(dialog.textContent).toContain("Кожна зброя має властивість майстерності");
    expect(screen.getByTestId("creation-step-rule-full-link").getAttribute("href")).toBe(
      "/2024/rules/equipment#weapons--mastery-properties"
    );
  });

  it("без знімка уривків плашка лишається звичайним посиланням у довідник", () => {
    render(<CreationStepRuleLink stepId="race" ruleset="RULES_2014" />);

    const trigger = screen.getByTestId("creation-step-rule-link");
    expect(trigger.getAttribute("href")).toBe("/rules/abilities#1-choose-a-race");
    fireEvent.click(trigger);
    expect(screen.queryByTestId("creation-step-rule-dialog")).toBeNull();
  });

  it("крок без статті в цій редакції не малює нічого", () => {
    const { container } = render(
      <CreationStepRuleLink stepId="weaponMastery" ruleset="RULES_2014" excerpts={EXCERPTS} />
    );
    expect(container.innerHTML).toBe("");
  });
});
