// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SessionContext } from "next-auth/react";

vi.mock("@/lib/actions/problem-report-actions", () => ({ reportProblem: vi.fn(), uploadProblemReportImage: vi.fn() }));
vi.mock("@/lib/components/auth/GoogleAuthDialog", () => ({
  default: ({ open }: { open: boolean }) => (open ? <div>Діалог входу відкритий</div> : null),
}));

import { ReportProblemDialog } from "@/lib/components/problemReport/ReportProblemDialog";

type SessionValue = NonNullable<React.ContextType<typeof SessionContext>>;

function renderDialog(status?: SessionValue["status"]) {
  const dialog = <ReportProblemDialog open onOpenChange={() => {}} />;
  if (!status) return render(dialog);
  const session = { status, data: null, update: async () => null } as SessionValue;
  return render(<SessionContext.Provider value={session}>{dialog}</SessionContext.Provider>);
}

afterEach(cleanup);

describe("діалог репорту про проблему", () => {
  it("гостю замість форми відкриває вхід", () => {
    renderDialog("unauthenticated");

    expect(screen.getByText("Діалог входу відкритий")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("користувачу показує форму", () => {
    renderDialog("authenticated");

    expect(screen.getByRole("textbox")).toBeTruthy();
    expect(screen.queryByText("Діалог входу відкритий")).toBeNull();
  });

  it("поза SessionProvider (екран глобальної помилки) не падає й показує форму", () => {
    renderDialog();

    expect(screen.getByRole("textbox")).toBeTruthy();
  });
});
