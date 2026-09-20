import { describe, expect, it } from "vitest";
import { multiclass2024Fixtures } from "../fixtures/2024-multiclass";
import { MULTICLASS_SHARDS } from "../fixtures/2024-multiclass/shards";

describe("шарди матриці мультикласу 2024", () => {
  it("розкладають кожну фікстуру рівно в один шард — жодна не випадає і не подвоюється", () => {
    const sharded = MULTICLASS_SHARDS.flat().sort();
    const all = multiclass2024Fixtures.map((fixture) => fixture.id).sort();

    expect(sharded).toEqual(all);
  });
});
