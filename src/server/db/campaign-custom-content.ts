import { Prisma, type Ability, type RestType, type SkillProficiencyType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MAX_CAMPAIGN_FEATURES, MAX_CAMPAIGN_SKILLS, type CustomFeatureInput, type CustomSkillInput } from "@/rules/pers-custom-content";
import type { CustomSaveFailure } from "./pers-custom-content";

export const CAMPAIGN_SKILL_SELECT = { id: true, name: true, ability: true, proficiencyType: true, bonus: true } satisfies Prisma.GameSessionCustomSkillSelect;
export const CAMPAIGN_FEATURE_SELECT = { id: true, name: true, description: true, rollFormula: true, usesMax: true, restoredOn: true } satisfies Prisma.GameSessionCustomFeatureSelect;
export type CampaignSkillView = Prisma.GameSessionCustomSkillGetPayload<{ select: typeof CAMPAIGN_SKILL_SELECT }>;
export type CampaignFeatureView = Prisma.GameSessionCustomFeatureGetPayload<{ select: typeof CAMPAIGN_FEATURE_SELECT }>;

export async function saveCampaignSkill(sessionId: number, skillId: number | null, input: CustomSkillInput): Promise<CustomSaveFailure | null> {
  const data = { name: input.name, ability: input.ability as Ability, proficiencyType: input.proficiencyType as SkillProficiencyType, bonus: input.bonus };
  try {
    if (skillId === null) {
      if ((await prisma.gameSessionCustomSkill.count({ where: { gameSessionId: sessionId } })) >= MAX_CAMPAIGN_SKILLS) return { success: false, error: `Можна додати до ${MAX_CAMPAIGN_SKILLS} навичок.` };
      await prisma.gameSessionCustomSkill.create({ data: { ...data, gameSessionId: sessionId } });
    } else {
      if (!(await prisma.gameSessionCustomSkill.updateMany({ where: { id: skillId, gameSessionId: sessionId }, data })).count) return { success: false, error: "Навичку не знайдено." };
      await copySkillToHeroes(skillId);
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { success: false, error: "Навичка з такою назвою вже є." };
    throw error;
  }
  await syncCampaignCopies(sessionId);
  return null;
}

export async function saveCampaignFeature(sessionId: number, featureId: number | null, input: CustomFeatureInput): Promise<CustomSaveFailure | null> {
  const data = { ...input, restoredOn: input.restoredOn as RestType | null };
  if (featureId === null) {
    if ((await prisma.gameSessionCustomFeature.count({ where: { gameSessionId: sessionId } })) >= MAX_CAMPAIGN_FEATURES) return { success: false, error: `Можна додати до ${MAX_CAMPAIGN_FEATURES} здібностей.` };
    await prisma.gameSessionCustomFeature.create({ data: { ...data, gameSessionId: sessionId } });
  } else {
    if (!(await prisma.gameSessionCustomFeature.updateMany({ where: { id: featureId, gameSessionId: sessionId }, data })).count) return { success: false, error: "Здібність не знайдено." };
    await copyFeatureToHeroes(featureId);
  }
  await syncCampaignCopies(sessionId);
  return null;
}

export async function deleteCampaignSkill(sessionId: number, skillId: number): Promise<void> {
  await prisma.gameSessionCustomSkill.deleteMany({ where: { id: skillId, gameSessionId: sessionId } });
}

export async function deleteCampaignFeature(sessionId: number, featureId: number): Promise<void> {
  await prisma.gameSessionCustomFeature.deleteMany({ where: { id: featureId, gameSessionId: sessionId } });
}

/// Власна навичка героя з тією ж назвою лишається, копія кампанії тоді не перейменовується.
async function copySkillToHeroes(skillId: number) {
  await prisma.$executeRaw`
    UPDATE public.pers_custom_skill copy SET name = t.name, ability = t.ability, proficiency_type = t.proficiency_type, bonus = t.bonus
    FROM public.game_session_custom_skill t
    WHERE t.game_session_custom_skill_id = ${skillId} AND copy.campaign_skill_id = t.game_session_custom_skill_id
      AND NOT EXISTS (SELECT 1 FROM public.pers_custom_skill other WHERE other.pers_id = copy.pers_id AND other.name = t.name AND other.pers_custom_skill_id <> copy.pers_custom_skill_id)`;
}

/// Лічильник рахується як у findUsesRemainingAfterEdit: більший максимум одразу додає використання, менший обрізає залишок.
async function copyFeatureToHeroes(featureId: number) {
  await prisma.$executeRaw`
    UPDATE public.pers_custom_feature copy SET name = t.name, description = t.description, roll_formula = t.roll_formula, restored_on = t.restored_on, uses_max = t.uses_max,
      uses_remaining = CASE
        WHEN t.uses_max IS NULL THEN NULL
        WHEN copy.uses_max IS NULL OR copy.uses_remaining IS NULL THEN t.uses_max
        ELSE LEAST(t.uses_max, copy.uses_remaining + GREATEST(0, t.uses_max - copy.uses_max))
      END
    FROM public.game_session_custom_feature t
    WHERE t.game_session_custom_feature_id = ${featureId} AND copy.campaign_feature_id = t.game_session_custom_feature_id`;
}

/// Герої активної кампанії мають копії всіх її навичок і здібностей; герой, що пішов, або архів — без них.
export async function syncCampaignCopies(sessionId: number): Promise<void> {
  await prisma.$transaction([
    prisma.$executeRaw`
      DELETE FROM public.pers_custom_skill copy USING public.game_session_custom_skill t
      WHERE copy.campaign_skill_id = t.game_session_custom_skill_id AND t.game_session_id = ${sessionId}
        AND copy.pers_id NOT IN (SELECT pers_id FROM public.game_session_member m JOIN public.game_session s USING (game_session_id) WHERE m.game_session_id = ${sessionId} AND m.pers_id IS NOT NULL AND s.archived_at IS NULL)`,
    prisma.$executeRaw`
      DELETE FROM public.pers_custom_feature copy USING public.game_session_custom_feature t
      WHERE copy.campaign_feature_id = t.game_session_custom_feature_id AND t.game_session_id = ${sessionId}
        AND copy.pers_id NOT IN (SELECT pers_id FROM public.game_session_member m JOIN public.game_session s USING (game_session_id) WHERE m.game_session_id = ${sessionId} AND m.pers_id IS NOT NULL AND s.archived_at IS NULL)`,
    prisma.$executeRaw`
      INSERT INTO public.pers_custom_skill (pers_id, name, ability, proficiency_type, bonus, campaign_skill_id)
      SELECT m.pers_id, t.name, t.ability, t.proficiency_type, t.bonus, t.game_session_custom_skill_id
      FROM public.game_session_custom_skill t
      JOIN public.game_session s ON s.game_session_id = t.game_session_id AND s.archived_at IS NULL
      JOIN public.game_session_member m ON m.game_session_id = t.game_session_id AND m.pers_id IS NOT NULL
      WHERE t.game_session_id = ${sessionId}
      ON CONFLICT DO NOTHING`,
    prisma.$executeRaw`
      INSERT INTO public.pers_custom_feature (pers_id, name, description, roll_formula, uses_max, uses_remaining, restored_on, campaign_feature_id)
      SELECT m.pers_id, t.name, t.description, t.roll_formula, t.uses_max, t.uses_max, t.restored_on, t.game_session_custom_feature_id
      FROM public.game_session_custom_feature t
      JOIN public.game_session s ON s.game_session_id = t.game_session_id AND s.archived_at IS NULL
      JOIN public.game_session_member m ON m.game_session_id = t.game_session_id AND m.pers_id IS NOT NULL
      WHERE t.game_session_id = ${sessionId}
      ON CONFLICT DO NOTHING`,
  ]);
}
