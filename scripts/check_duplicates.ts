import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const allFeatures = await prisma.feature.findMany({
      select: { featureId: true, name: true, engName: true }
    });

    const nameMap = new Map();
    allFeatures.forEach(f => {
      const list = nameMap.get(f.name) || [];
      list.push(f);
      nameMap.set(f.name, list);
    });

    console.log('Duplicate global features (by name):');
    let found = false;
    for (const [name, list] of nameMap.entries()) {
      if (list.length > 1) {
        console.log(`- ${name}: IDs [${list.map(f => f.featureId).join(', ')}] EngNames: [${list.map(f => f.engName).join(', ')}]`);
        found = true;
      }
    }
    if (!found) console.log('No duplicates found.');

    const engNameMap = new Map();
    allFeatures.forEach(f => {
      if (!f.engName) return;
      const list = engNameMap.get(f.engName) || [];
      list.push(f);
      engNameMap.set(f.engName, list);
    });

    console.log('\nDuplicate global features (by engName):');
    found = false;
    for (const [engName, list] of engNameMap.entries()) {
      if (list.length > 1) {
        console.log(`- ${engName}: IDs [${list.map(f => f.featureId).join(', ')}] Names: [${list.map(f => f.name).join(', ')}]`);
        found = true;
      }
    }
    if (!found) console.log('No duplicates found.');

  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
