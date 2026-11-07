import { readFileSync } from "node:fs";
import { encode } from "@auth/core/jwt";
import { devices, expect, test, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { parse } from "dotenv";
import { Client } from "pg";
import { assertTestDatabaseUrl } from "../helpers/assert-test-database-url";

const SESSION_COOKIE = "authjs.session-token";
const RUN = Date.now();
const GM_EMAIL = `map-gm-${RUN}@e2e.test`;
const PLAYER_EMAIL = `map-player-${RUN}@e2e.test`;
const SCREENSHOT_DIR = process.env.GAME_MAP_SCREENSHOT_DIR;

let db: Client;

test.beforeAll(async () => {
  db = new Client({ connectionString: assertTestDatabaseUrl(process.env.DATABASE_URL) });
  await db.connect();
});

test.afterAll(async () => {
  await db?.query(`DELETE FROM "user" WHERE email = ANY($1)`, [[GM_EMAIL, PLAYER_EMAIL]]);
  await db?.end();
});

async function createRoomWithHero(): Promise<number> {
  const [gmId, playerId] = await Promise.all(
    [[GM_EMAIL, "Ведуча Ірина"], [PLAYER_EMAIL, "Гравець Остап"]].map(async ([email, name]) =>
      (await db.query<{ user_id: number }>(`INSERT INTO "user" (email, name, email_verified) VALUES ($1, $2, now()) RETURNING user_id`, [email, name])).rows[0].user_id,
    ),
  );
  const persId = (await db.query<{ pers_id: number }>(`
    INSERT INTO pers (user_id, name, ruleset, class_id, race_id, background_id, current_hp, max_hp, str, dex, con, int, wis, cha, updated_at)
    SELECT $1, 'Торвальд', 'RULES_2014', c.class_id, r.race_id, b.background_id, 10, 10, 10, 10, 10, 10, 10, 10, now()
    FROM class c, race r, background b
    WHERE c.eng_name = 'FIGHTER_2014' AND r.name = 'HUMAN_2014' AND b.ruleset = 'RULES_2014' LIMIT 1 RETURNING pers_id`, [playerId])).rows[0].pers_id;
  const sessionId = (await db.query<{ game_session_id: number }>(`INSERT INTO game_session (owner_user_id, name, invite_token) VALUES ($1, 'Склеп', md5(random()::text)) RETURNING game_session_id`, [gmId])).rows[0].game_session_id;
  await db.query(`INSERT INTO game_session_member (game_session_id, user_id, role, pers_id) VALUES ($1, $2, 'GM', NULL), ($1, $3, 'PLAYER', $4)`, [sessionId, gmId, playerId, persId]);
  return sessionId;
}

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

async function dragTo(page: Page, token: Locator, map: Locator, fraction: { x: number; y: number }) {
  await page.getByRole("tabpanel", { name: "Мапа" }).evaluate((region) => region.scrollIntoView({ block: "center" }));
  const from = (await token.boundingBox())!;
  const box = (await map.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * fraction.x, box.y + box.height * fraction.y, { steps: 8 });
  await page.mouse.up();
}

async function waitForMapImage(page: Page) {
  await expect.poll(() => page.getByRole("img", { name: "Мапа сцени" }).evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
}

async function readTokenFraction(map: Locator, name: RegExp) {
  const box = (await map.boundingBox())!;
  const token = (await map.getByRole("button", { name }).boundingBox())!;
  return { x: (token.x + token.width / 2 - box.x) / box.width, y: (token.y + token.height / 2 - box.y) / box.height };
}

test("майстер ставить мапу, гравець тягне свій токен, обидва бачать рух наживо", async ({ browser, baseURL }) => {
  const sessionId = await createRoomWithHero();
  const gmContext = await openSignedInContext(browser, baseURL!, GM_EMAIL, devices["Desktop Chrome"]);
  const playerContext = await openSignedInContext(browser, baseURL!, PLAYER_EMAIL, devices["Pixel 7"]);
  const gm = await gmContext.newPage();
  const player = await playerContext.newPage();

  await gm.goto(`/games/${sessionId}`);
  await player.goto(`/games/${sessionId}`);
  await expect(gm.getByText("Відкрийте або додайте сцену, щоб побачити мапу.")).toBeVisible();
  await expect(player.getByText("Майстер ще не показав мапу")).toBeVisible();

  await gm.getByRole("button", { name: "Сцени" }).click();
  await gm.getByRole("button", { name: "Додайте першу сцену" }).click();
  await gm.getByLabel("Назва сцени").fill("Лісова дорога");
  await gm.getByLabel("Картинка мапи").setInputFiles("public/images/home-characters.webp");
  await gm.getByRole("button", { name: "Створити" }).click();
  await expect(gm.getByText("Не вдалося завантажити мапу — спробуйте іншу картинку")).toBeVisible();

  await db.query(
    `WITH scene AS (INSERT INTO game_scene (game_session_id, name, map_image_key) VALUES ($1, 'Лісова дорога', 'images/home-characters') RETURNING game_scene_id)
     UPDATE game_session SET active_scene_id = (SELECT game_scene_id FROM scene) WHERE game_session_id = $1`,
    [sessionId],
  );
  await gm.reload();
  await player.reload();
  const playerMap = player.getByRole("img", { name: "Мапа сцени" }).locator("..");
  const gmMap = gm.getByRole("img", { name: "Мапа сцени" }).locator("..");
  await Promise.all([gm, player].map(waitForMapImage));
  await expect(player.getByText("Перетягніть токен на мапу.")).toBeVisible();
  if (SCREENSHOT_DIR) await player.screenshot({ path: `${SCREENSHOT_DIR}/map-phone-tray.png`, fullPage: true });

  // Перший жест у dev-збірці може випередити гідратацію: повторюємо, доки токен не стане на мапу.
  await expect(async () => {
    await dragTo(player, player.getByRole("button", { name: /Токен «Торвальд»/ }), playerMap, { x: 0.3, y: 0.6 });
    await expect(playerMap.getByRole("button", { name: /Токен «Торвальд»/ })).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await expect(gmMap.getByRole("button", { name: /Токен «Торвальд»/ })).toBeVisible();
  const seenByGm = await readTokenFraction(gmMap, /Токен «Торвальд»/);
  expect(seenByGm.x).toBeCloseTo(0.3, 1);
  expect(seenByGm.y).toBeCloseTo(0.6, 1);

  await dragTo(gm, gmMap.getByRole("button", { name: /Токен «Торвальд»/ }), gmMap, { x: 0.8, y: 0.2 });
  await expect.poll(async () => (await readTokenFraction(playerMap, /Токен «Торвальд»/)).x, { timeout: 10_000 }).toBeCloseTo(0.8, 1);
  await player.reload();
  await waitForMapImage(player);
  expect((await readTokenFraction(playerMap, /Токен «Торвальд»/)).y).toBeCloseTo(0.2, 1);
  if (SCREENSHOT_DIR) {
    await player.screenshot({ path: `${SCREENSHOT_DIR}/map-phone-placed.png`, fullPage: true });
    await gm.screenshot({ path: `${SCREENSHOT_DIR}/map-desktop-gm.png`, fullPage: true });
  }

  await expect(async () => {
    const box = (await playerMap.boundingBox())!;
    await dragTo(player, playerMap.getByRole("button", { name: /Токен «Торвальд»/ }), playerMap, { x: 0.5, y: 1 + 60 / box.height });
    await expect(playerMap.getByRole("button", { name: /Токен «Торвальд»/ })).toHaveCount(0, { timeout: 1_000 });
  }).toPass();
  await expect(gmMap.getByRole("button", { name: /Токен «Торвальд»/ })).toHaveCount(0);
  await expect(gm.getByRole("button", { name: /Токен «Торвальд»/ })).toBeVisible();

  await gmContext.close();
  await playerContext.close();
});
