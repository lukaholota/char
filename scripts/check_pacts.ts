import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const characters = await prisma.pers.findMany({
      include: {
        features: { include: { feature: true } },
        choiceOptions: { include: { features: { include: { feature: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    for (const p of characters) {
      console.log(`Character: ${p.name} (ID: ${p.persId}, Level: ${p.level})`);
      
      console.log('  Features in pers.features:');
      p.features.forEach(pf => {
          const f = pf.feature;
          console.log(`    - ${f.name} (${f.engName}) [ID: ${f.featureId}]`);
      });

      console.log('  Choice Options:');
      p.choiceOptions.forEach(co => {
        console.log(`    - Group: ${co.groupName}, Option: ${co.optionName} (${co.optionNameEng})`);
        co.features.forEach(cof => {
          const f = cof.feature;
          console.log(`      -> Feature: ${f.name} (${f.engName}) [ID: ${f.featureId}]`);
        });
      });
      console.log('-------------------');
    }
  } catch (err) {
    console.error('Diagnostic failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
