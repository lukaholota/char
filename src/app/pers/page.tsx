import MultiStepForm from "@/lib/components/characterCreator/MultiStepForm";
import { prisma } from "@/lib/prisma";
import {BackgroundI, ClassI, RaceI} from "@/lib/types/model-types";


export default async function Page() {
  const [
    races,
    classes,
    backgrounds,
    weapons,
    // armors,
    feats,
  ] = await Promise.all([
    prisma.race.findMany({
      include: {
        raceChoiceOptions: {
          include: {
            traits: {
              include: {
                feature: true,
              }
            }
          }
        },
        subraces: {
          include: {
            traits: {
              include: {
                feature: true,
              }
            }
          }
        },
        raceVariants: {
          include: {
            traits: {
              include: {
                feature: true,
              }
            }
          }
        },
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
    prisma.feat.findMany({
      include: {
        grantsFeature: true,
        featChoiceOptions: {
          include: {
            choiceOption: {
              include: {
                features: {
                  include: {
                    feature: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { name: 'asc' }
      ]
    }),
  ])

  return (
    <>
      <MultiStepForm
        races={races}
        classes={classes}
        backgrounds={backgrounds}
        weapons={weapons}
        feats={feats}
      />
    </>
  );
}
