// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ContentDiscussion } from "@/components/discussion/ContentDiscussion";
import type { DiscussionView } from "@/lib/logic/content-discussion";

const pendingDiscussion = vi.hoisted(() => ({ resolve: (_view: unknown) => {} }));

vi.mock("next-auth/react", () => ({ useSession: () => ({ status: "unauthenticated" }) }));
vi.mock("@/lib/components/auth/GoogleAuthDialog", () => ({ default: () => null }));
vi.mock("@/lib/actions/content-discussion-actions", () => ({ voteContent: vi.fn(), addContentComment: vi.fn() }));
vi.mock("@/lib/actions/content-report-actions", () => ({ reportContent: vi.fn() }));
vi.mock("@/lib/catalog-reads", () => ({
  fetchDiscussion: () => new Promise((resolve) => (pendingDiscussion.resolve = resolve)),
}));
afterEach(cleanup);

const LOADED: DiscussionView = {
  target: "SPELL:RULES_2014:fireball",
  viewerName: null,
  score: 3,
  myVote: 0,
  canVoteTarget: true,
  canReportTarget: true,
  commentCount: 2,
  comments: [],
};

it("shows the empty discussion while loading and fills the same section when data arrives", async () => {
  render(<ContentDiscussion target={LOADED.target} />);

  const section = screen.getByRole("region", { name: "Обговорення" });
  expect(section.getAttribute("aria-busy")).toBe("true");
  expect(screen.getByRole("heading").textContent).toContain("(0)");
  expect(screen.getByRole("button", { name: "Подобається" })).toHaveProperty("disabled", true);
  expect(screen.getByRole("button", { name: "Надіслати" })).toHaveProperty("disabled", true);

  await act(async () => pendingDiscussion.resolve(LOADED));

  expect(screen.getByRole("region", { name: "Обговорення" })).toBe(section);
  expect(section.getAttribute("aria-busy")).toBe("false");
  expect(screen.getByRole("heading").textContent).toContain("(2)");
  expect(screen.getByRole("button", { name: "Подобається" })).toHaveProperty("disabled", false);
});
