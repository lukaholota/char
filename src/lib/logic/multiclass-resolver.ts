import { findPersPrimaryClass } from '@/server/db/multiclass-content';

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
  const pers = await findPersPrimaryClass(persId);

  if (!pers) throw new Error('Character not found');

  // Поки що реалізуємо для одного класу, але структура готова для розширення
  // Коли додаси модель PersClass, тут буде логіка обʼєднання
  
  const classes: ClassLevelInfo[] = [
      {
          classId: pers.classId,
          className: pers.className,
          classLevel: pers.level,
          hitDie: 10, // TODO: Get from constant or DB
      }
  ];

  return {
    persId,
    totalLevel: pers.level,
    classes,
  };
}
