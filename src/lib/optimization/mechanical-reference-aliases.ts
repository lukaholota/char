import type { HydrationTarget } from "./content-hydration";

const MECHANICAL_ALIASES: Readonly<Record<string, readonly string[]>> = {
  "Bigby's Hand": ["Arcane Hand", "Clenched Fist", "Grasping Hand", "Push"],
  "Maximilian's Earthen Grasp": ["Earthen Grasp"],
  "Guardian of Nature": ["Primal Beast", "Great Tree"],
  "Storm Sphere": ["Storm Cloud"],
  "Eldritch Claw Tattoo": ["Eldritch Maul", "Magical Strikes"],
  "Adrenaline Rush": ["Adrenaline Surge"],
  "Violent Attraction": ["Aggressive Attraction"],
  Ceremony: ["Dedication", "Wedding"],
  "Fighting Initiate": ["Martial Initiate"],
  Lucky: ["Luck Points"],
  Shortsword: ["Short Sword", "Shortswords"],
  Shortbow: ["Short bow"],
  Dart: ["Darts"],
  Handaxe: ["Handaxes"],
  Musket: ["muskets"],
  "Half Plate": ["Half-plate"],
  "Chain Mail": ["chainmail"],
  "Walloping Ammunition": ["Walloping Arrow"],
  "Fate Dealer's Deck": ["Fate Dealer’s Deck +1", "Fate Dealer’s Deck +2", "Fate Dealer’s Deck +3"],
  "Wraps of Unarmed Prowess": ["Wraps of Unarmed Prowess, +1", "Wraps of Unarmed Prowess, +2", "Wraps of Unarmed Prowess, +3"],
  "Figurine of Wondrous Power": ["Bronze Griffon", "Ebony Fly", "Golden Lions", "Ivory Goats", "Goat of Traveling", "Goat of Travail", "Goat of Terror", "Marble Elephant", "Onyx Dog", "Serpentine Owl"],
  "Prehistoric Figurines of Wondrous Power": ["Prehistoric Figure of Wondrous Power (Pyrite Plesiosaurus)", "Prehistoric Figure of Wondrous Power (Kyanite Pteranodon)", "Prehistoric Figure of Wondrous Power (Carnelian Triceratops)"],
  "Quiver of Ehlonna": ["Efficient Quiver / Quiver of Elhonna"],
  "Instrument of the Bards (Doss Lute)": ["Doss Lute"],
  "Instrument of the Bards (Anstruth Harp)": ["Anstruth Harp"],
  "Talisman of Pure Good": ["Talisman of Pure Good / Talisman of Ultimate Evil"],
  "Talisman of Ultimate Evil": ["Talisman of Pure Good / Talisman of Ultimate Evil"],
};

export function collectMechanicalReferenceAliases(targets: readonly HydrationTarget[]): HydrationTarget[] {
  return targets.filter((target) => target.engName !== "Lucky" || target.kind === "feat")
    .flatMap((target) => (MECHANICAL_ALIASES[target.engName] ?? [])
    .map((engName) => ({ ...target, engName })));
}
