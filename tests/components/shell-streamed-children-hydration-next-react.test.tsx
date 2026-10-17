// @vitest-environment jsdom
// Прод рендерить React-канарку, вбудовану в Next, а не react-dom з package.json; баг #418 бачили саме на ній.
import { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";

import { describeShellHydration } from "./helpers/shell-streamed-children-hydration";

vi.mock("react", async () => await import("next/dist/compiled/react"));
vi.mock("react/jsx-runtime", async () => await import("next/dist/compiled/react/jsx-runtime"));
vi.mock("react/jsx-dev-runtime", async () => await import("next/dist/compiled/react/jsx-dev-runtime"));
vi.mock("react-dom/client", async () => await import("next/dist/compiled/react-dom/client"));
vi.mock("react-dom/server", async () => await import("next/dist/compiled/react-dom/server.node"));
vi.mock("next/navigation", () => ({ usePathname: () => "/bestiary" }));

it("тест справді бере React, вбудований у Next", async () => {
  const { version } = await import("react");
  const { version: nextReactVersion } = await import("next/dist/compiled/react");
  expect(version).toBe(nextReactVersion);
  expect(version).toMatch(/canary/);
});

describeShellHydration("React, вбудований у Next", { startTransition, hydrateRoot, renderToString });
