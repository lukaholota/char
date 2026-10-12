// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { HomeCategoryCard } from "@/components/home/HomeCategoryCard";
import { HomeEditionScreen } from "@/components/home/HomeEditionScreen";
import { collectHomeCardRows } from "@/components/home/homeCategories";

vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("keeps a long press on a home card from lifting it for a preview or drag", () => {
  const [card] = collectHomeCardRows("2014").heroes;
  render(<HomeCategoryCard card={card} />);
  const link = screen.getByRole("link");
  expect(link.getAttribute("draggable")).toBe("false");
  expect(link.className).toContain("[-webkit-touch-callout:none]");
  expect(screen.getByRole("img").getAttribute("draggable")).toBe("false");
});

it("gives the home screen and its cards layers only while the entrance runs", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
  vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
  const { container } = render(<HomeEditionScreen edition="2014" />);
  const screenRoot = container.firstElementChild as HTMLElement;
  expect(screenRoot.dataset.entering).toBe("true");
  expect(screenRoot.querySelectorAll("[data-entrance-layer]").length).toBeGreaterThan(5);
  await waitFor(() => expect(screenRoot.dataset.entering).toBeUndefined(), { timeout: 3000 });
});
