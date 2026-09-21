// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { getSpellByIdOrSlug } from "@/lib/spellsData";
import { SpellModalCard } from "@/components/spells/SpellModalCard";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

afterEach(cleanup);

function findFireball() {
  const spell = getSpellByIdOrSlug("fireball");
  if (!spell) throw new Error("У каталозі 2014 немає fireball");
  return spell;
}

describe("хрестик картки заклинання", () => {
  it("картка без onClose не малює свого хрестика — його дає модалка каталогу", () => {
    render(<SpellModalCard spell={findFireball()} />);

    expect(screen.queryByRole("button", { name: "Закрити" })).toBeNull();
  });

  it("картка з onClose малює хрестик", () => {
    render(<SpellModalCard spell={findFireball()} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Закрити" })).toBeTruthy();
  });
});
