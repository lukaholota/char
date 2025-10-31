import { PrismaClient} from "../src/generated/prisma";
import { seedWeapons } from "./seed/weaponSeed";
import { seedArmor } from "./seed/armorSeed";
import { seedEquipmentPacks } from "./seed/equipmentPackSeed";
import { seedBackground } from "./seed/backgroundSeed";
import { seedRaceFeatures } from "./seed/raceFeatureSeed";
import { seedRaces } from "./seed/raceSeed";
import { seedMagicItems } from "./seed/magicItemSeed";
import { seedInfusions } from "./seed/infusionSeed";
import { seedInfusionFeatures } from "./seed/infusionFeaturesSeed";
const prisma = new PrismaClient()

async function main() {
    console.log('Starting seed...')

    await seedWeapons(prisma)
    await seedArmor(prisma)
    await seedEquipmentPacks(prisma)
    await seedBackground(prisma)
    await seedRaceFeatures(prisma)
    await seedRaces(prisma)
    await seedMagicItems(prisma)
    await seedInfusions(prisma)
    await seedInfusionFeatures(prisma)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
