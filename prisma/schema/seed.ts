import { PrismaClient} from "../src/generated/prisma";
import { seedWeapons } from "./seed/weaponSeed";
import { seedArmor } from "./seed/armorSeed";
import { seedEquipmentPacks } from "./seed/equipmentPackSeed";
import { seedBackground } from "./seed/backgroundSeed";
import { seedRaceFeatures } from "./seed/raceFeatureSeed";
import { seedRaces } from "./seed/raceSeed";
import { seedClassFeatures } from "./seed/classFeatureSeed";
import { seedClasses } from "./seed/classSeed";
import { seedChoiceOptions } from "./seed/choiceOptionSeed";
import { seedClassChoiceOptions } from "./seed/classChoiceOptionSeed";
import { seedClassOptionalFeatures } from "./seed/optionalFeatureSeed";
import { seedClassEquipment } from "./seed/classEquipmentSeed";
const prisma = new PrismaClient()

async function main() {
    console.log('Starting seed...')

    await seedWeapons(prisma)
    await seedArmor(prisma)
    await seedEquipmentPacks(prisma)
    await seedBackground(prisma)
    await seedRaceFeatures(prisma)
    await seedRaces(prisma)

    await seedClassFeatures(prisma)
    await seedClasses(prisma)
    await seedClassEquipment(prisma)
    await seedChoiceOptions(prisma)
    await seedClassChoiceOptions(prisma)
    await seedClassOptionalFeatures(prisma)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
