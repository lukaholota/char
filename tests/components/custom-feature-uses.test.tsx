// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PersWithRelations } from "@/lib/actions/pers";

const stepCustomFeatureUseAction = vi.hoisted(() => vi.fn(async () => ({ success: true })));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/lib/actions/pers-custom-content-actions", () => ({ stepCustomFeatureUseAction }));
vi.mock("@/hooks/useOfflineQueue", () => ({
  useOfflineQueue: () => ({ isOnline: true, commitOperation: async (_operation: unknown, send: (operationId: string) => Promise<unknown>) => ({ queued: false, result: await send("op-test") }) }),
}));

import { CustomFeaturesSection } from "@/lib/components/characterSheet/custom/CustomFeaturesSection";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const pers = {
  persId: 7,
  persCustomFeatures: [{ id: 3, persId: 7, name: "Мана", description: "", rollFormula: null, usesMax: 20, usesRemaining: 12, restoredOn: "LONG_REST" }],
} as unknown as PersWithRelations;

describe("власний ресурс на листі", () => {
  it("набране число змінює запас на різницю й показує його одразу", () => {
    const onPersUpdate = vi.fn();
    render(<CustomFeaturesSection pers={pers} onPersUpdate={onPersUpdate} />);
    const field = screen.getByRole("textbox", { name: "Мана: залишилось з 20" });
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "7" } });
    fireEvent.keyDown(field, { key: "Enter" });
    fireEvent.blur(field);

    expect(stepCustomFeatureUseAction).toHaveBeenCalledWith(7, 3, "spend", "op-test", 5);
    expect(onPersUpdate.mock.calls[0][0].persCustomFeatures[0].usesRemaining).toBe(7);
  });

  it("число понад максимум стає максимумом, а Escape нічого не змінює", () => {
    render(<CustomFeaturesSection pers={pers} onPersUpdate={vi.fn()} />);
    const field = screen.getByRole("textbox", { name: "Мана: залишилось з 20" });
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "99" } });
    fireEvent.blur(field);
    expect(stepCustomFeatureUseAction).toHaveBeenLastCalledWith(7, 3, "restore", "op-test", 8);

    stepCustomFeatureUseAction.mockClear();
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "3" } });
    fireEvent.keyDown(field, { key: "Escape" });
    fireEvent.blur(field);
    expect(stepCustomFeatureUseAction).not.toHaveBeenCalled();
  });

  it("кнопки й далі крокують на одиницю", () => {
    render(<CustomFeaturesSection pers={pers} onPersUpdate={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Витратити: Мана" }));
    expect(stepCustomFeatureUseAction).toHaveBeenCalledWith(7, 3, "spend", "op-test", 1);
  });
});
