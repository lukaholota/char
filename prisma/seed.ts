import 'dotenv/config';
import { prisma } from "@/lib/prisma";
import { seedWeapons } from "./seed/weaponSeed";
import { seedArmor } from "./seed/armorSeed";
import { seedEquipmentPacks } from "./seed/equipmentPackSeed";
import { seedBackground } from "./seed/backgroundSeed";
import { seedRaceFeatures } from "./seed/raceFeatureSeed";
import { seedRaces } from "./seed/raceSeed";
import { seedClassFeatures } from "./seed/classFeatureSeed";
import { seedClasses } from "./seed/classSeed";
import { seedSubclasses } from "./seed/subclassSeed";
import { seedSubclassFeatures } from "./seed/subclassFeatureSeed";
import { seedSubclassChoiceOptions } from "./seed/subclassChoiceOptionSeed";
import { seedClassEquipment } from "./seed/classEquipmentSeed";
import { seedChoiceOptions } from "./seed/choiceOptionSeed";
import { seedClassChoiceOptions } from "./seed/classChoiceOptionSeed";
import { seedClassOptionalFeatures } from "./seed/optionalFeatureSeed";
import { seedSubraces } from "./seed/subraceSeed";
import { seedSubraceFeatures } from "./seed/subraceFeatureSeed";
import { seedRaceVariants } from "./seed/raceVariantSeed";
import { seedRaceChoiceOptions } from "./seed/raceChoiceOptionSeed";

import { seedInfusionFeatures } from "./seed/infusionFeaturesSeed";
import { seedInfusions } from "./seed/infusionSeed";
import { seedMagicItems } from "./seed/magicItemSeed";
import { seedFeats } from "./seed/featSeed";

async function main() {
    console.log('Starting seed...')
    console.log('ВАЖЛИВО‼️‼️‼️‼️‼️ ЧЕРЕЗ SEEDINDEX НОВІ ФІЧІ МОЖНА ДОДАВАТИ ЛИШЕ В КІНЕЦЬ ФАЙЛУ! АБО ПЕРЕД ІНДЕКСУВАННЯМ ВСЕ ВИДАЛИТИ З БД!')
    // ВАЖЛИВО! ЧЕРЕЗ SEEDINDEX НОВІ ФІЧІ МОЖНА ДОДАВАТИ ЛИШЕ В КІНЕЦЬ ФАЙЛУ! АБО ПЕРЕД ІНДЕКСУВАННЯМ ВСЕ ВИДАЛИТИ З БД! поки стосується лише classEquipment та classOptionalFeature
    await seedWeapons(prisma)
    await seedArmor(prisma)
    await seedEquipmentPacks(prisma)
    await seedBackground(prisma)
    await seedRaceFeatures(prisma)
    await seedSubraceFeatures(prisma)
    await seedRaces(prisma)
    await seedSubraces(prisma)
    await seedRaceVariants(prisma)
    await seedRaceChoiceOptions(prisma)

    await seedClassFeatures(prisma)
    await seedInfusionFeatures(prisma) // features for infusions
    await seedClasses(prisma)
    await seedSubclasses(prisma)
    await seedSubclassFeatures(prisma)
    await seedChoiceOptions(prisma)
    await seedClassChoiceOptions(prisma)
    await seedSubclassChoiceOptions(prisma)
    
    await seedMagicItems(prisma) // items for infusions
    await seedInfusions(prisma)  // infusions themselves

    await seedClassOptionalFeatures(prisma)
    
    await seedFeats(prisma);
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
