import { expectAssembledCharacter } from "../assembly-acceptance";
import { expectCharacterMatchesDraft } from "../ready-preset-acceptance";
import type { SweepRun } from "./db-sweep";

export async function expectSavedCharacter(run: SweepRun): Promise<void> {
  if (run.request.kind === "level-one") await expectCharacterMatchesDraft(run.persId, run.request.body, run.content.creationContent);
  else await expectAssembledCharacter(run.persId, run.expectation!);
}
