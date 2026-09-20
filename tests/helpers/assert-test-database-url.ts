/**
 * Guards against ever pointing test tooling (Vitest, Playwright) at production data.
 * The DB-touching tests TRUNCATE user tables — against prod that destroys every character.
 */
export function assertTestDatabaseUrl(url: string | undefined): string {
  if (!url) {
    throw new Error(
      "DATABASE_URL не заданий. Тести читають його з .env.test — цей файл у git не зберігається.\n" +
        "Підняти локальну базу: ./scripts/local-test-db.sh clone",
    );
  }

  const databaseName = new URL(url).pathname.replace(/^\//, "");

  if (!databaseName.endsWith("_test")) {
    throw new Error(
      `Тести вимагають БД з суфіксом _test у назві. Отримано "${databaseName}". Зупинено.\n` +
        "Тести роблять TRUNCATE таблиць користувача — проти прода це знищить персонажів усіх користувачів.",
    );
  }

  return url;
}
