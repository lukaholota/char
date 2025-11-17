import { Button } from "@/components/ui/Button";
import MultiStepForm from "@/components/characterCreator/MultiStepForm";
import { prisma } from "@/prisma";
import {BackgroundI, ClassI, RaceI} from "@/types/model-types";


export default async function Page() {
  const [
    races,
    classes,
    backgrounds,
    weapon,
    armor,
    equipmentPacks] = await Promise.all([
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
        startingEquipmentOption: true,
        classChoiceOptions: true,
        classOptionalFeatures: true
      }
    }) as Promise<ClassI[]>,
    prisma.background.findMany() as Promise<BackgroundI[]>,
    prisma.weapon.findMany(),
    prisma.armor.findMany(),
    prisma.equipmentPack.findMany(),
  ])

  return (
    <>
      <MultiStepForm
        races={races}
        classes={classes}
        backgrounds={backgrounds}
        armor={armor}
        weapon={weapon}
        equipmentPacks={equipmentPacks}
      />
    </>
  );
}