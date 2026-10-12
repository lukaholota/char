// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { BranchReader } from "@/components/catalogs/reading/BranchReader";
import { NoAiModeProvider } from "@/components/no-ai/NoAiModeProvider";

const mocks = vi.hoisted(() => ({ pathname: "/classes" }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));

const COVER = "/images/subclasses/fighter-champion.webp";

afterEach(() => { cleanup(); window.history.replaceState({}, "", "/"); mocks.pathname = "/classes"; });

function renderReaderAt(pathname: string, coverSrc: string | null) {
  mocks.pathname = pathname;
  window.history.replaceState({}, "", pathname);
  return render(
    <NoAiModeProvider>
      <BranchReader
        name="Чемпіон" engName="Champion" sourceLabel={null} description={null}
        labels={{ parentName: "Воїн", backLabel: "До класу", kindLabel: "Підклас" }}
        is2024={false} focusOnOpen={false} onBack={() => {}} onClose={() => {}} coverSrc={coverSrc}
      >{null}</BranchReader>
    </NoAiModeProvider>,
  );
}

describe("обкладинка підкласу в рідері", () => {
  it("малює арт підкласу зі ШІ", () => {
    const { container } = renderReaderAt("/classes", COVER);
    const cover = container.querySelector("img");
    expect(cover?.getAttribute("alt")).toBe("Чемпіон");
    expect(decodeURIComponent(cover?.getAttribute("src") ?? "")).toContain(COVER);
  });

  it("не малює нічого без ШІ", () => {
    const { container } = renderReaderAt("/no-ai/classes", COVER);
    expect(container.querySelector("img")).toBeNull();
  });

  it("не малює нічого, коли арту підкласу ще немає", () => {
    const { container } = renderReaderAt("/classes", null);
    expect(container.querySelector("img")).toBeNull();
  });
});
