import type { ReactNode, TransitionFunction } from "react";
import type { HydrationOptions, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { App } from "@/components/ui/App";
import { RootGrid } from "@/components/ui/RootGrid";

export type ReactRuntime = {
  startTransition: (scope: TransitionFunction) => void;
  hydrateRoot: (container: Element, children: ReactNode, options?: HydrationOptions) => Root;
  renderToString: (children: ReactNode) => string;
};

const page = <div className="h-full w-full">сторінка</div>;
const navigation = <nav>навігація</nav>;

function buildShell(pageSlot: ReactNode) {
  return (
    <RootGrid>
      <App>{pageSlot}</App>
      {navigation}
    </RootGrid>
  );
}

function deliverLater<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), 5));
}

export function describeShellHydration(runtimeName: string, runtime: ReactRuntime) {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement("div");
    container.innerHTML = runtime.renderToString(buildShell(page));
    document.body.appendChild(container);
  });

  afterEach(() => {
    root?.unmount();
    root = null;
    container.remove();
  });

  async function hydrateLikeNext(shell: ReactNode) {
    const recoverableErrors: string[] = [];
    runtime.startTransition(() => {
      root = runtime.hydrateRoot(container, shell, { onRecoverableError: (error) => recoverableErrors.push(String(error)) });
    });
    await new Promise((resolve) => setTimeout(resolve, 60));
    return recoverableErrors;
  }

  describe(`Оболонка гідратується без перемальовування, коли серверні діти ще в дорозі (React #418, ${runtimeName})`, () => {
    it("вміст сторінки в <main> приходить пізніше — DOM з сервера лишається", async () => {
      const serverMain = container.querySelector("main");

      const errors = await hydrateLikeNext(buildShell(deliverLater(page)));

      expect(errors).toEqual([]);
      expect(container.querySelector("main")).toBe(serverMain);
      expect(container.querySelector("main")?.textContent).toBe("сторінка");
    });
  });
}
