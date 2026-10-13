// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { UnfinishedPresetNotice } from "@/components/optimization/UnfinishedPresetNotice";
import { rememberUnfinishedPreset, readUnfinishedPreset } from "@/lib/optimization/unfinished-preset";

beforeEach(() => {
  const items = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value), removeItem: (key: string) => void items.delete(key) });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("unfinished preset notice in the main creator", () => {
  it("leads back to the unfinished preset and can be hidden", async () => {
    rememberUnfinishedPreset({ buildId: "build-druid-dreams-githzerai-2014", title: "Друїд Кола сновидінь — Ґітцерай", href: "/char/create?preset=druid-dreams-githzerai-2014" });
    render(<UnfinishedPresetNotice />);
    expect((await screen.findByRole("link", { name: "Продовжити" })).getAttribute("href")).toBe("/char/create?preset=druid-dreams-githzerai-2014");
    expect(screen.getByText("Друїд Кола сновидінь — Ґітцерай")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Приховати" }));
    expect(screen.queryByRole("link", { name: "Продовжити" })).toBeNull();
    expect(readUnfinishedPreset()).toBeNull();
  });

  it("shows nothing without an unfinished preset or with a broken record", () => {
    localStorage.setItem("dnd-preset-2014-unfinished", "{broken");
    render(<UnfinishedPresetNotice />);
    expect(screen.queryByRole("region")).toBeNull();
  });
});
