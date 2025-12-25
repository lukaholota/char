import { prisma } from '@/lib/prisma';

export interface ClassLevelInfo {
  classId: number;
  className: string;
  classLevel: number;
  hitDie: number;
}

export interface MulticlassCharacter {
  persId: number;
  totalLevel: number;
  classes: ClassLevelInfo[];
}

export async function getMulticlassInfo(persId: number): Promise<MulticlassCharacter> {
  const pers = await prisma.pers.findUnique({
    where: { persId },
    include: {
      class: true, // Primary class
      // Тут має бути зв'язок з PersClass для мультикласів
      // persClasses: { include: { class: true } } 
    },
  });

  if (!pers) throw new Error('Character not found');

  // Поки що реалізуємо для одного класу, але структура готова для розширення
  // Коли додаси модель PersClass, тут буде логіка об'єднання
  
  const classes: ClassLevelInfo[] = [
      {
          classId: pers.classId,
          className: pers.class.name,
          classLevel: pers.level,
          hitDie: 10, // TODO: Get from constant or DB
      }
  ];

  // Mock logic for multiclass if PersClass existed
  // const extraClasses = await prisma.persClass.findMany(...)
  // classes.push(...)

  return {
    persId,
    totalLevel: pers.level,
    classes,
  };
}
