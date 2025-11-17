import * as CharacterTypes from './character-types';

declare global {
  namespace PrismaJson {
    type SkillProficiencies = CharacterTypes.SkillProficiencies;
    type RaceASI = CharacterTypes.RaceASI;
    type WeaponProficiencies = CharacterTypes.WeaponProficiencies;
    type ToolProficiencies = CharacterTypes.ToolProficiencies;
    type MulticlassReqs = CharacterTypes.MulticlassReqs;
    type WeaponProficienciesSpecial = CharacterTypes.WeaponProficienciesSpecial;
  }
}

export {};