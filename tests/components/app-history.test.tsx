// @vitest-environment jsdom
import { expect, it } from "vitest";
import { APP_HISTORY_SCRIPT } from "@/lib/pwa/history-bootstrap";

it("keeps Next state through push/replace and counts modal entries", async () => {
  history.replaceState({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: ["tree"] }, "", "/spells");
  new Function(APP_HISTORY_SCRIPT)();
  expect(history.state.__charHistoryIndex).toBe(0);
  history.pushState({ __modalBackButtonToken: "dialog" }, "");
  expect(history.state).toMatchObject({ __charHistoryIndex: 1, __modalBackButtonToken: "dialog" });
  history.replaceState({ __NA: true }, "", "/spells?search=test");
  expect(history.state).toEqual({ __NA: true, __charHistoryIndex: 1 });
  const popped = new Promise((resolve) => window.addEventListener("popstate", resolve, { once: true }));
  history.back(); await popped;
  expect(history.state).toMatchObject({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: ["tree"], __charHistoryIndex: 0 });
});
