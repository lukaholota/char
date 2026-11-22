// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ saveSkill: vi.fn(), saveFeature: vi.fn(), refresh: vi.fn(), toastSuccess: vi.fn() }));

vi.mock("@/lib/actions/campaign-custom-content-actions", () => ({ saveCampaignSkillAction: mocks.saveSkill, saveCampaignFeatureAction: mocks.saveFeature, deleteCampaignSkillAction: vi.fn(), deleteCampaignFeatureAction: vi.fn() }));
vi.mock("@/lib/actions/pers-custom-content-actions", () => ({}));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useModeRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess, error: vi.fn() } }));

const { CampaignCustomContent } = await import("@/components/games/CampaignCustomContent");
type View = Parameters<typeof CampaignCustomContent>[0]["view"];

const view = {
  id: 9,
  campaignSkills: [{ id: 1, name: "Чуття", ability: "WIS", proficiencyType: "NONE", bonus: 0 }],
  campaignFeatures: [{ id: 2, name: "Порох", description: "", rollFormula: null, usesMax: 3, restoredOn: "LONG_REST" }],
} as unknown as View;

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("навички й здібності кампанії в керуванні", () => {
  it("показує шаблони й редагує навичку тією ж формою, що й на листі", async () => {
    mocks.saveSkill.mockResolvedValue({ success: true });
    render(<CampaignCustomContent view={view} />);
    expect(screen.getByText("3 · довгий відпочинок")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Редагувати навичку кампанії: Чуття" }));
    fireEvent.change(screen.getByLabelText("Назва"), { target: { value: "Чуття звіра" } });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    expect(mocks.saveSkill).toHaveBeenCalledWith(9, 1, { name: "Чуття звіра", ability: "WIS", proficiencyType: "NONE", bonus: "" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("помилка поля лишає форму відкритою", async () => {
    mocks.saveFeature.mockResolvedValue({ success: false, errors: { name: "Вкажіть назву." } });
    render(<CampaignCustomContent view={view} />);
    fireEvent.click(screen.getByRole("button", { name: "Здібність" }));
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));
    expect(await screen.findByText("Вкажіть назву.")).toBeTruthy();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
