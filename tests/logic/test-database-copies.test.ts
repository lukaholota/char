import { afterEach, describe, expect, it, vi } from "vitest";
import { findAbandonedCopyNames, isProcessAlive } from "../helpers/test-database-copies";

function failKillWith(code: string) {
  vi.spyOn(process, "kill").mockImplementation(() => {
    throw Object.assign(new Error(code), { code });
  });
}

afterEach(() => vi.restoreAllMocks());

describe("прибирання копій тестової бази після впалого прогону", () => {
  const databaseNames = [
    "spells_test",
    "spells_run_101_w1_test",
    "spells_run_101_w2_test",
    "spells_run_202_w1_test",
    "spells_night_int_tests_run_303_w1_test",
    "spells_night_int_tests_test",
  ];

  it("бере лише копії свого джерела, чий прогін завершився", () => {
    const aliveRuns = new Set([202]);
    expect(findAbandonedCopyNames(databaseNames, "spells_test", (runId) => aliveRuns.has(runId))).toEqual([
      "spells_run_101_w1_test",
      "spells_run_101_w2_test",
    ]);
  });

  it("не чіпає копій іншого джерела, навіть коли їхній прогін мертвий", () => {
    expect(findAbandonedCopyNames(databaseNames, "spells_night_int_tests_test", () => false)).toEqual([
      "spells_night_int_tests_run_303_w1_test",
    ]);
  });

  it("процес, якому не можна слати сигнал (EPERM), живий", () => {
    failKillWith("EPERM");
    expect(isProcessAlive(4242)).toBe(true);
  });

  it("процесу, якого немає (ESRCH), немає", () => {
    failKillWith("ESRCH");
    expect(isProcessAlive(4242)).toBe(false);
  });

  it("поточний процес живий", () => {
    expect(isProcessAlive(process.pid)).toBe(true);
  });
});
