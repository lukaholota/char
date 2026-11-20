import { prisma } from "@/lib/prisma";
import { HOMEBREW_ITEM_ENG_NAME_PREFIX } from "@/lib/logic/homebrew-catalog";

// Дані користувача — це pers / user / account і все, що на них транзитивно посилається.
// Список рахується з бази, а не ведеться руками: писаний руками перелік пропускав неявні
// m2m-таблиці Prisma (`_PersToSpell`, `_ChoiceOptionToPers`), бо вони не підпадають під `pers*`.
// Той самий запит, що в scripts/db-clone.sh — розходитися їм не можна.
const USER_DATA_TABLES_QUERY = `
  WITH RECURSIVE user_data(oid) AS (
    SELECT c.oid
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND c.relname IN ('pers', 'user', 'account')
    UNION
    SELECT con.conrelid
      FROM pg_constraint con
      JOIN user_data u ON con.confrelid = u.oid
     WHERE con.contype = 'f'
  )
  SELECT format('public.%I', c.relname) AS qualified_name
    FROM user_data u
    JOIN pg_class c ON c.oid = u.oid
   ORDER BY 1
`;

let cachedTableList: string | null = null;

async function findUserDataTables(): Promise<string> {
  if (cachedTableList) return cachedTableList;

  const rows = await prisma.$queryRawUnsafe<{ qualified_name: string }[]>(USER_DATA_TABLES_QUERY);
  if (rows.length === 0) {
    throw new Error("Замикання таблиць користувача порожнє — схема не та, яку очікують тести.");
  }

  cachedTableList = rows.map((row) => row.qualified_name).join(", ");
  return cachedTableList;
}

export async function resetUserData(): Promise<void> {
  const tables = await findUserDataTables();
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
  await prisma.magicItem.deleteMany({ where: { engName: { startsWith: HOMEBREW_ITEM_ENG_NAME_PREFIX } } });
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
