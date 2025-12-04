import MultiStepForm from "@/lib/components/characterCreator/MultiStepForm";
import { prisma } from "@/lib/prisma";
import {BackgroundI, ClassI, RaceI} from "@/lib/types/model-types";


export default async function Page() {
  const [
    races,
    classes,
    backgrounds,
    weapons,
    armors,
  ] = await Promise.all([
    prisma.race.findMany({
      include: {
        subraces: true,
      },
      orderBy: {
        raceId: 'asc'
      }
    }) as Promise<RaceI[]>,
    prisma.class.findMany({
      include: {
        subclasses: true,
        startingEquipmentOption: {
          include: {
            equipmentPack: true
          }
        },
        classChoiceOptions: true,
        classOptionalFeatures: true
      }
    }) as Promise<ClassI[]>,
    prisma.background.findMany() as Promise<BackgroundI[]>,
    prisma.weapon.findMany(),
    prisma.armor.findMany(),
  ])

  return (
    <>
      <MultiStepForm
        races={races}
        classes={classes}
        backgrounds={backgrounds}
        weapons={weapons}
      />
    </>
  );
}
