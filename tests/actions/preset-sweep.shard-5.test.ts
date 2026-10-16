import { vi } from "vitest";
import { registerPresetSweepShard } from "../helpers/preset-sweep/register-db";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

registerPresetSweepShard(4);
