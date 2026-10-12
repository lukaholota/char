// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { NoAiModeProvider, useNoAiHref } from "@/components/no-ai/NoAiModeProvider";
import { useVisibleImageSrc } from "@/components/no-ai/ContentImage";

const mocks = vi.hoisted(() => ({ pathname: "/char/create" }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); window.history.replaceState({}, "", "/"); mocks.pathname = "/char/create"; });

function PresetLinkAndArt() {
  const buildHref = useNoAiHref();
  const image = useVisibleImageSrc("/images/classes/monk.webp");
  return <><a href={buildHref("/char/presets")}>Готові персонажі</a><img loading="lazy" src={image ?? undefined} alt="Монах" /></>;
}

describe("no-AI hydration after a rewrite", () => {
  it("replaces canonical server attributes with no-AI links and manual art after hydration", () => {
    const hydrationErrors = vi.spyOn(console, "error").mockImplementation(() => {});
    const container = document.createElement("div");
    window.history.replaceState({}, "", "/char/presets");
    container.innerHTML = renderToString(<NoAiModeProvider><PresetLinkAndArt /></NoAiModeProvider>);
    document.body.append(container);
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/char/presets");
    mocks.pathname = "/no-ai/char/create";
    window.history.replaceState({}, "", "/no-ai/char/presets");
    render(<NoAiModeProvider><PresetLinkAndArt /></NoAiModeProvider>, { hydrate: true, container });
    expect(screen.getByRole("link").getAttribute("href")).toBe("/no-ai/char/presets");
    expect(screen.getByRole("img").getAttribute("src")).toBe("/images/manual/classes/monk.webp");
    expect(hydrationErrors).not.toHaveBeenCalled();
  });
  it("updates the mode on history and catalog navigation when Next retains a canonical pathname", () => {
    window.history.replaceState({}, "", "/no-ai/char/create");
    render(<NoAiModeProvider><PresetLinkAndArt /></NoAiModeProvider>);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/no-ai/char/presets");
    act(() => { window.history.replaceState({}, "", "/char/create"); window.dispatchEvent(new PopStateEvent("popstate")); });
    expect(screen.getByRole("link").getAttribute("href")).toBe("/char/presets");
    act(() => { window.history.replaceState({}, "", "/no-ai/char/create"); window.dispatchEvent(new Event("locationchange")); });
    expect(screen.getByRole("img").getAttribute("src")).toBe("/images/manual/classes/monk.webp");
  });
});
