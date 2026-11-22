import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { saveCampaignFeatureAction, saveCampaignSkillAction } from "@/lib/actions/campaign-custom-content-actions";
import { deleteCampaignSkill, saveCampaignFeature, saveCampaignSkill } from "@/server/db/campaign-custom-content";
import { deleteCustomFeature, saveCustomFeature, saveCustomSkill } from "@/server/db/pers-custom-content";
import { createGameSession, findGameSessionView, joinGameSessionByToken, leaveGameSession, setGameSessionArchived, toggleRoomHero } from "@/server/db/game-sessions";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const skill = { name: "Екстрасенсорика", ability: "WIS" as const, proficiencyType: "PROFICIENT" as const, bonus: 1 };
const resource = { name: "Порох", description: "Набої для мушкета", rollFormula: null, usesMax: 3, restoredOn: "LONG_REST" as const };

async function createUser(label: string) {
  return prisma.user.create({ data: { email: `${label}-${randomUUID()}@campaign.test`, name: label } });
}

async function createPers(userId: number, name: string) {
  const cls = await prisma.class.findFirstOrThrow({ where: { name: "FIGHTER_2014" } });
  const race = await prisma.race.findFirstOrThrow({ where: { name: "HUMAN_2014" } });
  const background = await prisma.background.findFirstOrThrow({ where: { ruleset: "RULES_2014" } });
  const pers = await prisma.pers.create({
    data: { userId, name, ruleset: "RULES_2014", classId: cls.classId, raceId: race.raceId, backgroundId: background.backgroundId, currentHp: 10, maxHp: 10, str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  });
  return pers.persId;
}

async function createCampaign() {
  const gm = await createUser("gm");
  const player = await createUser("player");
  const created = await createGameSession(gm.id, "Пустка");
  if (!created.ok) throw new Error(created.error);
  const sessionId = created.value.id;
  await joinGameSessionByToken((await findGameSessionView(sessionId, gm.id))!.inviteToken!, player.id);
  const persId = await createPers(player.id, "Ведмідь");
  await toggleRoomHero(sessionId, player.id, persId);
  return { gm, player, sessionId, persId };
}

const listCopies = (persId: number) =>
  Promise.all([
    prisma.persCustomSkill.findMany({ where: { persId, campaignSkillId: { not: null } } }),
    prisma.persCustomFeature.findMany({ where: { persId, campaignFeatureId: { not: null } } }),
  ]);

describe("навички й здібності кампанії", () => {
  it("кожен герой отримує копію, правка майстра доходить до копій, лічильник героя не скидається", async () => {
    const { sessionId, persId } = await createCampaign();
    expect(await saveCampaignSkill(sessionId, null, skill)).toBeNull();
    expect(await saveCampaignFeature(sessionId, null, resource)).toBeNull();
    const [[skillCopy], [featureCopy]] = await listCopies(persId);
    expect(skillCopy).toMatchObject({ name: "Екстрасенсорика", ability: "WIS", bonus: 1 });
    expect(featureCopy).toMatchObject({ name: "Порох", usesMax: 3, usesRemaining: 3, restoredOn: "LONG_REST" });

    await prisma.persCustomFeature.update({ where: { id: featureCopy.id }, data: { usesRemaining: 1 } });
    await saveCampaignSkill(sessionId, skillCopy.campaignSkillId, { ...skill, name: "Чуття", bonus: 2 });
    await saveCampaignFeature(sessionId, featureCopy.campaignFeatureId, { ...resource, usesMax: 5 });
    const [[editedSkill], [editedFeature]] = await listCopies(persId);
    expect(editedSkill).toMatchObject({ id: skillCopy.id, name: "Чуття", bonus: 2 });
    expect(editedFeature).toMatchObject({ id: featureCopy.id, usesMax: 5, usesRemaining: 3 });
  });

  it("гравець не змінює й не видаляє копію кампанії, але власна навичка з тією ж назвою лишається його", async () => {
    const { sessionId, persId } = await createCampaign();
    await saveCustomSkill(persId, null, skill);
    await saveCampaignSkill(sessionId, null, skill);
    await saveCampaignFeature(sessionId, null, resource);
    const [skillCopies, [featureCopy]] = await listCopies(persId);
    expect(skillCopies).toHaveLength(0);

    expect(await saveCustomFeature(persId, featureCopy.id, { ...resource, name: "Мій порох" })).toEqual({ success: false, error: "Здібність не знайдено." });
    await deleteCustomFeature(persId, featureCopy.id);
    expect(await prisma.persCustomFeature.findUnique({ where: { id: featureCopy.id } })).toMatchObject({ name: "Порох" });
  });

  it("вихід героя, архів і видалення шаблону прибирають копії; новий герой отримує наявні", async () => {
    const { gm, player, sessionId, persId } = await createCampaign();
    await saveCampaignSkill(sessionId, null, skill);
    const templateId = (await prisma.gameSessionCustomSkill.findFirstOrThrow({ where: { gameSessionId: sessionId } })).id;

    await setGameSessionArchived(sessionId, gm.id, true);
    expect((await listCopies(persId))[0]).toHaveLength(0);
    await setGameSessionArchived(sessionId, gm.id, false);
    expect((await listCopies(persId))[0]).toHaveLength(1);

    const secondPersId = await createPers(player.id, "Лис");
    await toggleRoomHero(sessionId, player.id, secondPersId);
    expect((await listCopies(secondPersId))[0]).toHaveLength(1);

    await deleteCampaignSkill(sessionId, templateId);
    expect((await listCopies(secondPersId))[0]).toHaveLength(0);
    await saveCampaignSkill(sessionId, null, skill);
    await leaveGameSession(sessionId, player.id);
    expect((await listCopies(persId))[0]).toHaveLength(0);
    expect((await listCopies(secondPersId))[0]).toHaveLength(0);
  });

  it("лише майстер змінює навички кампанії; помилки полів повертаються до форми", async () => {
    const { gm, player, sessionId } = await createCampaign();
    vi.mocked(auth).mockResolvedValue({ user: { id: String(player.id), email: player.email } } as never);
    expect(await saveCampaignSkillAction(sessionId, null, { name: "Чуття", ability: "WIS", proficiencyType: "NONE", bonus: "" })).toMatchObject({ success: false, error: expect.any(String) });
    expect(await prisma.gameSessionCustomSkill.count()).toBe(0);

    vi.mocked(auth).mockResolvedValue({ user: { id: String(gm.id), email: gm.email } } as never);
    expect(await saveCampaignFeatureAction(sessionId, null, { name: "", description: "", rollFormula: "", usesMax: "", restoredOn: "" })).toMatchObject({ success: false, errors: { name: expect.any(String) } });
    expect(await saveCampaignSkillAction(sessionId, null, { name: "Чуття", ability: "WIS", proficiencyType: "NONE", bonus: "" })).toEqual({ success: true });
    expect((await findGameSessionView(sessionId, gm.id))!.campaignSkills).toMatchObject([{ name: "Чуття" }]);
    expect((await findGameSessionView(sessionId, player.id))!.campaignSkills).toEqual([]);
  });
});
