import { GeneratedCreature } from "../generate-creatures";
import { monsters2014Part1 } from "./monsters-2014-part1";
import { monsters2014Part2 } from "./monsters-2014-part2";
import { monsters2014Part3 } from "./monsters-2014-part3";
import { monsters2014Part4 } from "./monsters-2014-part4";
import { monsters2014Part5 } from "./monsters-2014-part5";
import { monsters2014Part6 } from "./monsters-2014-part6";
import { monsters2014Part7 } from "./monsters-2014-part7";
import { monsters2014Part8 } from "./monsters-2014-part8";
import { monsters2014Part9 } from "./monsters-2014-part9";
import { monsters2014Part10 } from "./monsters-2014-part10";
import { monstersVolo } from "./monsters-volo";
import { monstersFizban } from "./monsters-fizban";
import { monstersMordenkainen } from "./monsters-mordenkainen";

export const allMonsters2014: GeneratedCreature[] = [
  ...monsters2014Part1,
  ...monsters2014Part2,
  ...monsters2014Part3,
  ...monsters2014Part4,
  ...monsters2014Part5,
  ...monsters2014Part6,
  ...monsters2014Part7,
  ...monsters2014Part8,
  ...monsters2014Part9,
  ...monsters2014Part10,
  ...monstersVolo,
  ...monstersFizban,
  ...monstersMordenkainen,
];
