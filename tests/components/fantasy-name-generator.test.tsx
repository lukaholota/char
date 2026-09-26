// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useFantasyNameGenerator } from "@/hooks/useFantasyNameGenerator";
import { maleNames, femaleNames, maleFantasyNames, femaleFantasyNames } from "@/lib/refs/names";

const ALL_NAMES = new Set<string>([...maleNames, ...femaleNames, ...maleFantasyNames, ...femaleFantasyNames]);

afterEach(cleanup);

describe("генератор імені на кроці «Імʼя»", () => {
  it("підставляє імʼя зі списків, щойно вони довантажились", async () => {
    const { result } = renderHook(() => useFantasyNameGenerator({ parts: { name: true, surname: false } }));

    await waitFor(() => expect(result.current.currentName).not.toBe(""));
    expect(ALL_NAMES.has(result.current.currentName)).toBe(true);
  });

  it("кнопка «інше імʼя» повертає імʼя зі списків", async () => {
    const { result } = renderHook(() => useFantasyNameGenerator({ parts: { name: true, surname: false } }));
    await waitFor(() => expect(result.current.currentName).not.toBe(""));

    let generated = "";
    act(() => {
      generated = result.current.generateName();
    });

    expect(ALL_NAMES.has(generated)).toBe(true);
    expect(result.current.currentName).toBe(generated);
  });
});
