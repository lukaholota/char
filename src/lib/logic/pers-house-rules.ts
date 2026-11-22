import { parseCampaignHouseRules, parsePersHouseRules, resolveHouseRules, type HouseRules } from "@/rules/house-rules";

export type HouseRulesSource = { houseRules?: unknown; gameSessionMembers?: ReadonlyArray<{ gameSession: { houseRules: unknown } }> };

export function findPersHouseRules(pers: HouseRulesSource): HouseRules {
  return resolveHouseRules(parsePersHouseRules(pers.houseRules), listCampaignHouseRules(pers));
}

export function findCampaignHouseRulesForPers(pers: HouseRulesSource): HouseRules {
  return resolveHouseRules({ attunementLimit: null, magicSystem: null }, listCampaignHouseRules(pers));
}

function listCampaignHouseRules(pers: HouseRulesSource) {
  return (pers.gameSessionMembers ?? []).map((member) => parseCampaignHouseRules(member.gameSession.houseRules));
}
