/**
 * Пʼятнадцять персонажів розкладені по чотирьох файлах-шардах, щоб матриця М1–М27 ішла
 * паралельно на воркерах: один файл будував їх 74 с поспіль. Фікстури, які одна перевірка
 * називає разом (М5: 17 і 25; М11: 12 і 15; М12: 17 і 18; М13: 16, 19, 24; М14: 18 і 21),
 * мусять лежати в одному шарді — інакше перевірка не зібралася б ніде. Шарди зважені за
 * кількістю рівнів, які треба пройти: №24 один іде до 20-го.
 */
export const MULTICLASS_SHARDS: ReadonlyArray<ReadonlyArray<string>> = [
  ["14-human-fighter6-rogue4", "17-dwarf-fighter3-wizard5", "18-halfling-rogue4-bard4", "21-human-wizard4-cleric4", "25-orc-wizard1-fighter5-rogue1"],
  ["16-infernal-tiefling-warlock5-bard3", "19-forest-gnome-sorcerer9-warlock4", "24-aasimar-sorcerer19-warlock1"],
  ["11-human-druid5-cleric1", "12-drow-paladin5-sorcerer3", "15-wood-elf-ranger5-druid3"],
  ["13-stone-goliath-monk5-rogue3", "20-orc-barbarian5-fighter5", "22-blue-dragonborn-fighter4-paladin4", "23-dwarf-monk4-sorcerer4"],
];

export function findShardFixtureIds(shardNumber: number): ReadonlyArray<string> {
  const ids = MULTICLASS_SHARDS[shardNumber - 1];
  if (!ids) throw new Error(`Шарда №${shardNumber} немає: їх ${MULTICLASS_SHARDS.length}`);
  return ids;
}
