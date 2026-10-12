import { z } from "zod";

export const rpgbotSearchRequestSchema = z.object({ query: z.string().max(512), ruleset: z.enum(["RULES_2014", "RULES_2024"]) });
export const rpgbotSearchHitsSchema = z.array(z.object({ id: z.string().startsWith("rpgbot-section-"), title: z.string(),
  subtitle: z.string(), category: z.literal("rpgbot"), categoryLabel: z.string(),
  href: z.string().startsWith("/rules/optimization/"), badge: z.literal("Розділ"), keywords: z.array(z.string()) }));
