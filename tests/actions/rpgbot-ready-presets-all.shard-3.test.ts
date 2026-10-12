import { vi } from "vitest";
import { registerReadyPresetShard } from "../helpers/ready-preset-acceptance";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

registerReadyPresetShard(2);
