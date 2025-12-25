
import { prisma } from './src/lib/prisma';

async function checkConnection() {
  const count = await prisma.pers.count();
  console.log(`Pers count: ${count}`);
}

checkConnection()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
