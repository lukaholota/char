
import "dotenv/config";

import { prisma } from "./src/lib/prisma";

async function checkPers() {
  const persIdArg = process.argv[2];
  const persId = persIdArg ? Number(persIdArg) : 3;

  if (!Number.isFinite(persId) || persId <= 0) {
    throw new Error(`Invalid persId: ${persIdArg}`);
  }

  const pers = await prisma.pers.findUnique({
    where: { persId },
    include: {
      class: true,
      race: true,
      background: true,
      skills: true,
      armors: {
        include: {
          armor: true
        }
      },
      weapons: {
        include: {
          weapon: true
        }
      },
      feats: {
        include: {
          feat: true,
          choices: {
            include: {
              choiceOption: true
            }
          }
        }
      },
      features: {
        include: {
          feature: true
        }
      },
      choiceOptions: true
    }
  });

  console.log(JSON.stringify(pers, null, 2));
}

checkPers()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
