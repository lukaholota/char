// @vitest-environment jsdom
import { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { vi } from "vitest";

import { describeShellHydration } from "./helpers/shell-streamed-children-hydration";

vi.mock("next/navigation", () => ({ usePathname: () => "/bestiary" }));

describeShellHydration("react-dom з package.json", { startTransition, hydrateRoot, renderToString });
