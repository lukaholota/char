import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { encode } from "@auth/core/jwt";
import { devices, expect, test, type APIRequestContext, type Browser, type BrowserContext } from "@playwright/test";
import { parse } from "dotenv";
import { Client } from "pg";
import { assertTestDatabaseUrl } from "../helpers/assert-test-database-url";

const SESSION_COOKIE = "authjs.session-token";
const RUN = Date.now();
const GM_EMAIL = `games-gm-${RUN}@e2e.test`;
const PLAYER_EMAIL = `games-player-${RUN}@e2e.test`;

test.describe.configure({ mode: "serial" });

let db: Client;

test.beforeAll(async () => {
  db = new Client({ connectionString: assertTestDatabaseUrl(process.env.DATABASE_URL) });
  await db.connect();
  for (const [email, name] of [[GM_EMAIL, "Ведуча Ірина"], [PLAYER_EMAIL, "Гравець Остап"]]) {
    await db.query(`INSERT INTO "user" (email, name, email_verified) VALUES ($1, $2, now())`, [email, name]);
  }
});

test.afterAll(async () => {
  await db?.query(`DELETE FROM "user" WHERE email = ANY($1)`, [[GM_EMAIL, PLAYER_EMAIL]]);
  await db?.end();
});

async function openSignedInContext(browser: Browser, baseURL: string, email: string, device: object): Promise<BrowserContext> {
  const userId = (await db.query<{ user_id: number }>(`SELECT user_id FROM "user" WHERE email = $1`, [email])).rows[0].user_id;
  const value = await encode({ token: { sub: String(userId), userId: String(userId), email, name: email }, secret: readAuthSecret(), salt: SESSION_COOKIE });
  const context = await browser.newContext({ ...device, baseURL });
  await context.addCookies([{ name: SESSION_COOKIE, value, url: baseURL }]);
  return context;
}

function readAuthSecret(): string {
  const secret = parse(readFileSync(".env.local")).AUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET не знайдено в .env.local");
  return secret;
}

function postRoll(request: APIRequestContext, sessionId: number, label: string, visibility: "PUBLIC" | "GM" | "SELF", idempotencyKey = randomUUID()) {
  return request.post(`/api/game-sessions/${sessionId}/events`, {
    data: {
      idempotencyKey,
      visibility,
      source: "FREE",
      persId: null,
      label,
      roll: { d20Mode: null, modeSources: [], groups: [{ sides: 20, values: [17] }], extra: [], bonus: 0, total: 17, check: null },
      rolledAt: new Date().toISOString(),
    },
  });
}

test("ведучий і гравець бачать спільний журнал, а приховані кидки — лише ті, кому дозволено", async ({ browser, baseURL }) => {
  const gmContext = await openSignedInContext(browser, baseURL!, GM_EMAIL, devices["Desktop Chrome"]);
  const playerContext = await openSignedInContext(browser, baseURL!, PLAYER_EMAIL, devices["Pixel 7"]);
  const gm = await gmContext.newPage();
  const player = await playerContext.newPage();

  await gm.goto("/games");
  await gm.getByLabel("Назва нової кімнати").fill("Копальня Фанделвера");
  await gm.getByRole("button", { name: "Створити" }).click();
  await gm.waitForURL(/\/games\/\d+$/);
  const sessionId = Number(new URL(gm.url()).pathname.split("/").at(-1));
  await expect(gm.getByText("Ваші кидки йдуть у цю кімнату")).toBeVisible();
  const inviteLink = await gm.getByLabel("Посилання-запрошення").inputValue();

  await player.goto(new URL(inviteLink).pathname);
  await player.getByRole("button", { name: "Приєднатися" }).tap();
  await player.waitForURL(`**/games/${sessionId}`);
  await expect(gm.getByRole("region", { name: /Учасники/ }).getByText("Гравець Остап")).toBeVisible();

  const repeatedKey = randomUUID();
  expect((await postRoll(playerContext.request, sessionId, "Атака сокирою", "PUBLIC", repeatedKey)).ok()).toBe(true);
  expect((await postRoll(playerContext.request, sessionId, "Атака сокирою", "PUBLIC", repeatedKey)).ok()).toBe(true);
  expect((await postRoll(playerContext.request, sessionId, "Таємна Скритність", "SELF")).ok()).toBe(true);
  expect((await postRoll(playerContext.request, sessionId, "Перевірка для ведучого", "GM")).ok()).toBe(true);

  const gmJournal = gm.getByRole("region", { name: "Журнал кидків" });
  await expect(gmJournal.getByText("Перевірка для ведучого", { exact: true })).toBeVisible();
  await expect(gmJournal.getByText("Атака сокирою", { exact: true })).toHaveCount(1);
  await expect(gmJournal.getByText("Таємна Скритність", { exact: true })).toHaveCount(0);

  const playerJournal = player.getByRole("region", { name: "Журнал кидків" });
  await expect(playerJournal.getByText("Таємна Скритність", { exact: true })).toBeVisible();
  await expect(playerJournal.getByText("Перевірка для ведучого", { exact: true })).toBeVisible();

  const gmEvents = await (await gmContext.request.get(`/api/game-sessions/${sessionId}/events`)).json();
  expect(JSON.stringify(gmEvents)).not.toContain("Таємна Скритність");

  await player.goto("/games");
  await player.getByRole("button", { name: /Журнал кімнати/ }).tap();
  const sheet = player.getByRole("dialog");
  await expect(sheet.getByText("Атака сокирою", { exact: true })).toBeVisible();
  expect((await postRoll(gmContext.request, sessionId, "Ініціатива гобліна", "PUBLIC")).ok()).toBe(true);
  await expect(sheet.getByText("Ініціатива гобліна", { exact: true })).toBeVisible();
  const sheetBox = await sheet.boundingBox();
  expect(sheetBox && sheetBox.y + sheetBox.height).toBeLessThanOrEqual(player.viewportSize()!.height + 1);

  gm.once("dialog", (dialog) => void dialog.accept());
  await gm.getByRole("button", { name: /Заархівувати кімнату|В архів/ }).click();
  await expect(gm.getByText("Кімната в архіві", { exact: false }).first()).toBeVisible();
  expect((await postRoll(playerContext.request, sessionId, "Запізнілий кидок", "PUBLIC")).status()).toBe(409);
  await expect(player.getByText("Кімнату заархівовано — кидки знову лише у вас")).toBeVisible();

  await gmContext.close();
  await playerContext.close();
});

test("чужа кімната й чужий журнал закриті", async ({ browser, baseURL }) => {
  const outsiderEmail = `games-outsider-${RUN}@e2e.test`;
  await db.query(`INSERT INTO "user" (email, name, email_verified) VALUES ($1, 'Сторонній', now())`, [outsiderEmail]);
  try {
    const sessionId = (await db.query<{ game_session_id: number }>(`SELECT game_session_id FROM game_session gs JOIN "user" u ON u.user_id = gs.owner_user_id WHERE u.email = $1`, [GM_EMAIL])).rows[0].game_session_id;
    const outsider = await openSignedInContext(browser, baseURL!, outsiderEmail, devices["Desktop Chrome"]);
    expect((await outsider.request.get(`/api/game-sessions/${sessionId}/events`)).status()).toBe(403);
    expect((await outsider.request.get(`/api/game-sessions/${sessionId}/stream`)).status()).toBe(403);
    const page = await outsider.newPage();
    expect((await page.goto(`/games/${sessionId}`))?.status()).toBe(404);
    await outsider.close();
  } finally {
    await db.query(`DELETE FROM "user" WHERE email = $1`, [outsiderEmail]);
  }
});
