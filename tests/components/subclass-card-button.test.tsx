// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SubclassCardButton } from "@/components/optimization/SubclassCardButton";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const HEADING_LINKS = {
  "section-inquisitive": { href: "/classes?class=1&subclass=2", name: "Допитливий" },
  "section-phantom": { href: "/classes?class=1&subclass=3", name: "Фантом" },
};
const SUBJECT = { href: "/classes?class=1&subclass=4", name: "Злодій" };

function renderSections(tops: Record<string, number>) {
  for (const [id, top] of Object.entries(tops)) {
    const section = document.createElement("section");
    section.id = id;
    section.getBoundingClientRect = () => ({ top, bottom: top + 500 }) as DOMRect;
    document.body.append(section);
  }
}

describe("floating subclass card button on an article", () => {
  it("names the subclass section being read, and the guide's own subclass elsewhere", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => { callback(0); return 1; });
    renderSections({ "section-inquisitive": 2000, "section-phantom": -100 });
    render(<SubclassCardButton headingLinks={HEADING_LINKS} subject={SUBJECT} />);
    expect(screen.getByRole("button", { name: "Підклас: Фантом" })).toBeTruthy();

    document.getElementById("section-phantom")!.getBoundingClientRect = () => ({ top: -900, bottom: -400 }) as DOMRect;
    await act(async () => { fireEvent.scroll(window); });
    expect(screen.getByRole("button", { name: "Підклас: Злодій" })).toBeTruthy();
    document.body.querySelectorAll("section").forEach((section) => section.remove());
  });

  it("stays hidden on an article about no single subclass", () => {
    render(<SubclassCardButton headingLinks={{}} subject={null} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
