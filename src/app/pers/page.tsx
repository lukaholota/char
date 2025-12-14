import MultiStepForm from "@/lib/components/characterCreator/MultiStepForm";
import { prisma } from "@/lib/prisma";
import {BackgroundI, ClassI, RaceI} from "@/lib/types/model-types";


export default async function Page() {
  const [
    races,
    classes,
    backgrounds,
    weapons,
  ] = await Promise.all([
    prisma.race.findMany({
      include: {
        subraces: true,
        traits: {
          include: {
            feature: true,
          }
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { raceId: 'asc' }
      ]
    }) as Promise<RaceI[]>,
    prisma.class.findMany({
      include: {
        subclasses: {
          include: {
            features: {
              include: {
                feature: true,
              },
            },
            expandedSpells: true,
          },
        },
        startingEquipmentOption: {
          include: {
            equipmentPack: true,
            weapon: true,
            armor: true,
          },
        },
        classChoiceOptions: {
          include: {
            choiceOption: {
              include: {
                features: {
                  include: {
                    feature: true,
                  },
                },
              },
            },
          },
        },
        classOptionalFeatures: {
          include: {
            feature: true,
            replacesFeatures: {
              include: {
                replacedFeature: true,
              },
            },
            appearsOnlyIfChoicesTaken: true,
          },
        },
        features: {
          include: {
            feature: true,
          },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { classId: 'asc' }
      ]
    }) as unknown as Promise<ClassI[]>,
    prisma.background.findMany() as Promise<BackgroundI[]>,
    prisma.weapon.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { weaponId: 'asc' }
      ]
    }),
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
