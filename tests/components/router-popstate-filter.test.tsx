// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  RESERVE_FIRST_POPSTATE_LISTENER_SCRIPT,
  installRedundantTraversalFilter,
  rememberRouterHref,
} from "@/lib/router-popstate-filter";

const nextJsState = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: ["", { children: ["char", {}] }] };

function goBackAndCollectStates(): Promise<unknown[]> {
  const seenByRouter: unknown[] = [];
  const recordLikeNextRouter = (event: PopStateEvent) => seenByRouter.push(event.state);
  window.addEventListener("popstate", recordLikeNextRouter);
  return new Promise((resolve) => {
    window.addEventListener(
      "popstate",
      () => {
        window.removeEventListener("popstate", recordLikeNextRouter);
        resolve(seenByRouter);
      },
      { once: true }
    );
    window.history.back();
  });
}

describe("«Назад» туди, де Next уже стоїть, не будить роутер Next", () => {
  let uninstall: () => void = () => {};
  beforeAll(() => {
    new Function(RESERVE_FIRST_POPSTATE_LISTENER_SCRIPT)();
  });
  beforeEach(() => {
    uninstall = installRedundantTraversalFilter();
  });
  afterEach(() => uninstall());

  it("закриття модалки заклинання: Next бачить подію без стану й не перемальовує лист", async () => {
    window.history.replaceState(nextJsState, "", "/char/7?slide=magic");
    rememberRouterHref("/char/7", "slide=magic");
    window.history.pushState({ ...nextJsState, __spellModalDepth: 1 }, "", "/char/7?slide=magic&spell=shield&edition=2024");

    expect(await goBackAndCollectStates()).toEqual([null]);
  });

  it("закриття діалогу з власним записом історії на тій самій адресі — теж без Next", async () => {
    window.history.replaceState(nextJsState, "", "/char/7");
    rememberRouterHref("/char/7", "");
    window.history.pushState({ ...nextJsState, __modalBackButtonToken: "t" }, "", "/char/7");

    expect(await goBackAndCollectStates()).toEqual([null]);
  });

  it("повернення на іншу сторінку Next отримує зі станом", async () => {
    window.history.replaceState(nextJsState, "", "/char/7");
    window.history.pushState(nextJsState, "", "/char/7/levelup");
    rememberRouterHref("/char/7/levelup", "");

    expect(await goBackAndCollectStates()).toEqual([nextJsState]);
  });

  it("параметр edition без заклинання — справжня зміна адреси, Next її бачить", async () => {
    window.history.replaceState(nextJsState, "", "/spells?edition=2024");
    window.history.pushState(nextJsState, "", "/spells");
    rememberRouterHref("/spells", "");

    expect(await goBackAndCollectStates()).toEqual([nextJsState]);
  });
});

describe("Next пропускає popstate без стану", () => {
  it("перевірка «!event.state» стоїть у його обробнику раніше за перехід", () => {
    const appRouter = readFileSync("node_modules/next/dist/client/components/app-router.js", "utf8");
    const handler = appRouter.slice(appRouter.indexOf("const onPopState = (event)=>{"));

    expect(handler.indexOf("if (!event.state) {")).toBeGreaterThan(0);
    expect(handler.indexOf("if (!event.state) {")).toBeLessThan(handler.indexOf("dispatchTraverseAction"));
  });
});
