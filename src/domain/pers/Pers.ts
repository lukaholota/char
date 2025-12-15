import { AbilityScores } from "./AbilityScores";
import { HitPoints } from "./HitPoints";
import { Money } from "./Money.ts";
import { Ability } from "./Ability";
import { PersClass } from "./PersClass";
import { Race } from "./Race";
import { Background } from "./Background";
import { Skill } from "./Skill";
import { AbilitySchema } from "./CreatePersInput.schema";
import { Equipment } from "./Equipment";
import { CharacterNotes } from "./CharacterNotes";

export class Pers {
  constructor(
    readonly persId: number,
    readonly userId: number,

    private name: string,
    private level: number,

    private race: Race,
    private persClass: PersClass,
    private background: Background,

    private abilityScores: AbilityScores,
    private hitPoints: HitPoints,
    private money: Money,

    private skills: Skill[],

    private additionalSaveProficiencies: Ability[],

    private equipment: Equipment,

    private notes: CharacterNotes,

    readonly createdAt: Date,
    private updatedAt: Date,

    private miscSaveBonuses?: Record<AbilitySchema, number>,
  ) {
    if (level < 1) {
      throw new Error("Character level must be >= 1");
    }
  }

  /* ====== ПОВЕДІНКА ====== */

  levelUp() {
    this.level += 1;
    this.updatedAt = new Date();
  }

  rename(newName: string) {
    if (!newName.trim()) {
      throw new Error("Name cannot be empty");
    }
    this.name = newName;
  }

  getSnapshot() {
    return {
      name: this.name,
      level: this.level,
      race: this.race,
      class: this.characterClass,
    };
  }
}
