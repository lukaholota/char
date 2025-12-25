import 'dotenv/config';
import { prisma } from "@/lib/prisma";
import { seedRaceVariants } from "./seed/raceVariantSeed";

async function main() {
    console.log('Starting seed variants...')
    await seedRaceVariants(prisma)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
