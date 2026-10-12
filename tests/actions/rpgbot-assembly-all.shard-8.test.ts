import { vi } from "vitest";
import { registerAssemblyShard } from "../helpers/assembly-acceptance";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.setConfig({ testTimeout: 120_000 });

registerAssemblyShard(7);
