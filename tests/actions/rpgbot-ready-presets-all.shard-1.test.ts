import { vi } from "vitest";
import { registerReadyPresetShard, registerSensitivityCheck, registerShardCoverageCheck } from "../helpers/ready-preset-acceptance";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

registerShardCoverageCheck();
registerSensitivityCheck();
registerReadyPresetShard(0);
