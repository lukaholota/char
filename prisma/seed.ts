import 'dotenv/config';
import { prisma } from "@/lib/prisma";
import { seedWeapons as _seedWeapons } from "./seed/weaponSeed";
import { seedArmor as _seedArmor } from "./seed/armorSeed";
import { seedEquipmentPacks as _seedEquipmentPacks } from "./seed/equipmentPackSeed";
import { seedBackground as _seedBackground } from "./seed/backgroundSeed";
import { seedRaceFeatures as _seedRaceFeatures } from "./seed/raceFeatureSeed";
import { seedRaces as _seedRaces } from "./seed/raceSeed";
import { seedClassFeatures as _seedClassFeatures } from "./seed/classFeatureSeed";
import { seedClasses as _seedClasses } from "./seed/classSeed";
import { seedSubclasses as _seedSubclasses } from "./seed/subclassSeed";
import { seedSubclassFeatures as _seedSubclassFeatures } from "./seed/subclassFeatureSeed";
import { seedSubclassChoiceOptions as _seedSubclassChoiceOptions } from "./seed/subclassChoiceOptionSeed";
import { seedClassEquipment as _seedClassEquipment } from "./seed/classEquipmentSeed";
import { seedChoiceOptions as _seedChoiceOptions } from "./seed/choiceOptionSeed";
import { seedClassChoiceOptions as _seedClassChoiceOptions } from "./seed/classChoiceOptionSeed";
import { seedClassOptionalFeatures as _seedClassOptionalFeatures } from "./seed/optionalFeatureSeed";
import { seedSubraces as _seedSubraces } from "./seed/subraceSeed";
import { seedSubraceFeatures as _seedSubraceFeatures } from "./seed/subraceFeatureSeed";
import { seedRaceVariants as _seedRaceVariants } from "./seed/raceVariantSeed";
import { seedRaceChoiceOptions as _seedRaceChoiceOptions } from "./seed/raceChoiceOptionSeed";

import { seedInfusionFeatures as _seedInfusionFeatures } from "./seed/infusionFeaturesSeed";
import { seedInfusions as _seedInfusions } from "./seed/infusionSeed";
import { seedMagicItems as _seedMagicItems } from "./seed/magicItemSeed";
import { seedFeats as _seedFeats } from "./seed/featSeed";
import { seedFeatChoiceOptions as _seedFeatChoiceOptions } from "./seed/featChoiceOptionSeed";

async function main() {
    console.log('Starting seed...')
    console.log('ВАЖЛИВО‼️‼️‼️‼️‼️ ЧЕРЕЗ SEEDINDEX НОВІ ФІЧІ МОЖНА ДОДАВАТИ ЛИШЕ В КІНЕЦЬ ФАЙЛУ! АБО ПЕРЕД ІНДЕКСУВАННЯМ ВСЕ ВИДАЛИТИ З БД!')
    // ВАЖЛИВО! ЧЕРЕЗ SEEDINDEX НОВІ ФІЧІ МОЖНА ДОДАВАТИ ЛИШЕ В КІНЕЦЬ ФАЙЛУ! АБО ПЕРЕД ІНДЕКСУВАННЯМ ВСЕ ВИДАЛИТИ З БД! поки стосується лише classEquipment та classOptionalFeature
    // await seedWeapons(prisma)
    // await _seedArmor(prisma)
    // await seedEquipmentPacks(prisma)
    // await _seedBackground(prisma)
    // await _seedRaceFeatures(prisma)
    // await _seedSubraceFeatures(prisma)
    // await _seedRaces(prisma)
    // await seedSubraces(prisma)
    // await seedRaceVariants(prisma)
    // await _seedRaceChoiceOptions(prisma)

    // await seedClasses(prisma)
    // await _seedClassEquipment(prisma) 
    // await _seedSubclasses(prisma)
    // await _seedSubclassChoiceOptions(prisma)
    // await _seedChoiceOptions(prisma)
    // await seedClassChoiceOptions(prisma)
    // await seedSubclassChoiceOptions(prisma)
    
    // await seedMagicItems(prisma) // items for infusions
    // await seedInfusions(prisma)  // infusions themselves

    // await seedClassOptionalFeatures(prisma)
    
    await _seedFeats(prisma);
    await _seedBackground(prisma);
    await _seedSubclassFeatures(prisma);
    // await _seedFeatChoiceOptions(prisma);

    // await _seedClassFeatures(prisma)
    // await _seedInfusionFeatures(prisma) // features for infusions
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
