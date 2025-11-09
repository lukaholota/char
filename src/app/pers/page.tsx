import { Button } from "@/components/ui/Button";
import MultiStepForm from "@/components/characterCreator/MultiStepForm";
import { prisma } from "@/prisma";


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
    }),
    prisma.class.findMany({
      include: {
        subclasses: true,
        startingEquipmentOption: true,
        classChoiceOptions: true,
        classOptionalFeatures: true
      }
    }),
    prisma.background.findMany(),
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