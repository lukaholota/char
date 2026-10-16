import { describe, it } from "vitest";
import { createLikeThePage, expectReplayKeepsCharacter, openSweptSession, registerSweepFixture } from "./db-sweep";
import { expectSavedCharacter } from "./saved-character";
import { describeSweepCase, listShardCases, PRESET_SWEEP_SHARD_COUNT } from "./shards";

export function registerPresetSweepShard(shardIndex: number): void {
  const cases = listShardCases(shardIndex);
  const fixture = registerSweepFixture(`shard-${shardIndex + 1}`);
  describe(`preset sweep through the page path, shard ${shardIndex + 1}/${PRESET_SWEEP_SHARD_COUNT}`, () => {
    it.each(cases.map((sweepCase) => [describeSweepCase(sweepCase), sweepCase] as const))("%s", async (_name, sweepCase) => {
      const content = await fixture.contentOf(sweepCase.ruleset);
      const run = await createLikeThePage(sweepCase, openSweptSession(sweepCase, content), content);
      await expectSavedCharacter(run);
      await expectReplayKeepsCharacter(run, fixture.ownerId());
    });
  });
}
