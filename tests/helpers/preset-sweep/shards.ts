import { readdirSync } from "node:fs";
import { SWEEP_EDITIONS } from "./editions";
import { listCustomizedSweepCases, listPresetSweepCases, type PresetSweepCase } from "./cases";

export const PRESET_SWEEP_SHARD_COUNT = 80;
export const MAX_SWEEP_COST_PER_SHARD = 480;
// 0 until the customized cases that fail on the database (run of 16.10) are triaged.
export const CUSTOMIZED_DATABASE_TRIALS = 0;
export const SWEEP_SHARD_FILE_PATTERN = /^preset-sweep\.shard-\d+\.test\.ts$/;
const CREATION_COST = 3;

export function listAllSweepCases(): PresetSweepCase[] {
  return SWEEP_EDITIONS.flatMap((ruleset) => [...listPresetSweepCases(ruleset), ...listCustomizedSweepCases(ruleset, CUSTOMIZED_DATABASE_TRIALS)]);
}

export function estimateSweepCost(sweepCase: PresetSweepCase): number {
  return CREATION_COST + sweepCase.targetLevel - 1;
}

export function describeSweepCase(sweepCase: PresetSweepCase): string {
  const customized = sweepCase.customizedTrial === undefined ? "" : ` (налаштований, спроба ${sweepCase.customizedTrial})`;
  return `${sweepCase.ruleset} ${sweepCase.slug} → ${sweepCase.targetLevel}${customized}`;
}

export function splitIntoShards(cases: readonly PresetSweepCase[], shardCount: number): PresetSweepCase[][] {
  const shards = Array.from({ length: shardCount }, () => ({ cost: 0, cases: [] as PresetSweepCase[] }));
  const heaviestFirst = [...cases].sort((left, right) => estimateSweepCost(right) - estimateSweepCost(left) || describeSweepCase(left).localeCompare(describeSweepCase(right)));
  for (const sweepCase of heaviestFirst) {
    const lightest = shards.reduce((best, shard) => (shard.cost < best.cost ? shard : best));
    lightest.cases.push(sweepCase);
    lightest.cost += estimateSweepCost(sweepCase);
  }
  return shards.map((shard) => shard.cases);
}

export function listShardCases(shardIndex: number): PresetSweepCase[] {
  return splitIntoShards(listAllSweepCases(), PRESET_SWEEP_SHARD_COUNT)[shardIndex];
}

export function listSweepShardFiles(): string[] {
  return readdirSync("tests/actions").filter((name) => SWEEP_SHARD_FILE_PATTERN.test(name)).sort();
}
