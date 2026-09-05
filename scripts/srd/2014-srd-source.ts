import { join } from "path";

export const SRD_2014_REPO = "oldmanumby/dnd.srd.5.1";

/// SRD 5.1 (D&D 2014), CC-BY-4.0. Pinned to a commit so the snapshot cannot drift under us.
export const SRD_2014_COMMIT = "cecde944c90b50e630aad031b76af35933805013";

export const SRD_2014_DIR = join(process.cwd(), "data/2014/srd");

/// Upstream is a folder tree, unlike the flat 5.2.1 repo. Paths are kept verbatim so that
/// buildSrd2014FileUrl round-trips and provenance stays checkable against GitHub.
export const SRD_2014_FILES = [
  "Legal.md",
  "03_Characterization/Alignment.md",
  "03_Characterization/Beyond_1st_Level.md",
  "03_Characterization/Inspiration.md",
  "03_Characterization/Languages.md",
  "03_Characterization/Multiclassing.md",
  "04_Equipment/Coinage.md",
  "06_Gameplay/Adventuring.md",
  "06_Gameplay/Order_of_Combat.md",
  "06_Gameplay/Using_Ability_Scores.md",
  "07_Spells/Spellcasting.md",
  "08_Gamemastering/Conditions.md",
  "08_Gamemastering/Diseases.md",
  "08_Gamemastering/Madness.md",
  "08_Gamemastering/Objects.md",
  "08_Gamemastering/Pantheons.md",
  "08_Gamemastering/Planes.md",
  "08_Gamemastering/Poisons.md",
  "08_Gamemastering/Traps.md",
  "09_Magic_Items/Magic_Items.md",
  "09_Magic_Items/Sentient_Magic.md",
  /// Спорядження (KR20.7) дописане в кінець, а не в блок `04_Equipment/`: claimSlug роздає
  /// слаги в порядку розбору, і вставка посеред переліку зрушила б якорі вже опублікованих
  /// статей. Нове джерело завжди йде останнім.
  "04_Equipment/Armor.md",
  "04_Equipment/Weapons.md",
  "04_Equipment/Adventuring_Gear.md",
  "04_Equipment/Tools.md",
  "04_Equipment/Transportation.md",
  "04_Equipment/Trade_Goods.md",
  "04_Equipment/Expenses.md",
  "04_Equipment/Selling_Treasure.md",
  /// KR20.10: три файли прози, які первісний імпорт відкинув разом із каталогами —
  /// хоча каталожного в них лише зразок (Акoліт, Grappler), а решта пояснює механіку.
  "03_Characterization/Backgrounds.md",
  "01_Races/Racial_Traits.md",
  "05_Feats/Feats.md",
] as const;

export const SRD_2014_ATTRIBUTION =
  'This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by ' +
  "Wizards of the Coast LLC and available at " +
  "https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under " +
  "the Creative Commons Attribution 4.0 International License available at " +
  "https://creativecommons.org/licenses/by/4.0/legalcode.";

export function buildSrd2014FileUrl(file: string): string {
  const path = file.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${SRD_2014_REPO}/${SRD_2014_COMMIT}/${path}`;
}

export function findSrd2014FilePath(file: string): string {
  return join(SRD_2014_DIR, file);
}
