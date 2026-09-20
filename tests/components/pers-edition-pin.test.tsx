// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const navigation = vi.hoisted(() => ({ pathname: "/", push: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: navigation.push, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: null }), signOut: vi.fn() }));
vi.mock("@/lib/components/auth/GoogleAuthDialog", () => ({ default: () => null }));
vi.mock("@/lib/components/problemReport/ReportProblemDialog", () => ({ ReportProblemDialog: () => null }));

import { Navigation } from "@/components/ui/Navigation";
import { NoAiModeProvider, useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { PersEditionPin } from "@/components/ui/PersEditionPin";
import type { Ruleset } from "@/rules/types";

function renderPersPage(pathname: string, ruleset: Ruleset | null) {
  navigation.pathname = pathname;
  const { unmount } = render(
    <NoAiModeProvider>
      {ruleset ? <PersEditionPin ruleset={ruleset} /> : null}
      <Navigation />
    </NoAiModeProvider>
  );
  return unmount;
}

function findNavHref(label: string): string | null {
  return screen.getByText(label).closest("a")?.getAttribute("href") ?? null;
}

afterEach(cleanup);

describe("Редакція на сторінці персонажа береться з персонажа, а не з адреси", () => {
  it("лист персонажа 2024 веде меню в каталоги 2024", () => {
    renderPersPage("/char/5", "RULES_2024");

    expect(findNavHref("Персонажі")).toBe("/2024/char/home");
    expect(findNavHref("Заклинання")).toBe("/2024/spells");
  });

  it("у режимі без ШІ зберігає і префікс, і редакцію", () => {
    renderPersPage("/no-ai/char/5", "RULES_2024");

    expect(findNavHref("Персонажі")).toBe("/no-ai/2024/char/home");
    expect(findNavHref("Бестіарій")).toBe("/no-ai/2024/bestiary");
  });

  it("лист персонажа 2014 лишається на 2014", () => {
    renderPersPage("/char/5", "RULES_2014");

    expect(findNavHref("Заклинання")).toBe("/spells");
  });

  it("після виходу зі сторінки персонажа редакцію знову визначає адреса", () => {
    const unmount = renderPersPage("/char/5", "RULES_2024");
    unmount();
    renderPersPage("/spells", null);

    expect(findNavHref("Заклинання")).toBe("/spells");
  });
});

function LevelUpButton() {
  const router = useModeRouter();
  return <button onClick={() => router.push("/char/5/levelup")}>Підняти рівень</button>;
}

describe("Програмний перехід не губить режим без ШІ", () => {
  it("кнопка на листі веде в /no-ai/…", () => {
    navigation.pathname = "/no-ai/char/5";
    render(
      <NoAiModeProvider>
        <LevelUpButton />
      </NoAiModeProvider>
    );

    screen.getByText("Підняти рівень").click();

    expect(navigation.push).toHaveBeenCalledWith("/no-ai/char/5/levelup", undefined);
  });
});
