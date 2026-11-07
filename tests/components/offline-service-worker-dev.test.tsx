// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { OfflineServiceWorker } from "@/components/ui/OfflineServiceWorker";

vi.mock("next/navigation", () => ({ usePathname: () => "/char/home" }));

afterEach(cleanup);

describe("service worker у dev", () => {
  it("знімає воркер, що лишився від продакшн-збірки, і не реєструє новий", async () => {
    const unregister = vi.fn(async () => true);
    const register = vi.fn(async () => ({}));
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { register, getRegistrations: async () => [{ unregister }] } });
    render(<OfflineServiceWorker />);
    await waitFor(() => expect(unregister).toHaveBeenCalledOnce());
    expect(register).not.toHaveBeenCalled();
  });
});
