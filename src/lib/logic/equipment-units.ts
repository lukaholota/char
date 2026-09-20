/// Нормалізовані дані 2024 лишили одиниці такими, як у SRD («10 lb.», «45 GP», «5 Minutes»).
/// Каталог 2014 пише їх українською («10 фнт.», «45 зм», «5 хвилин») — сюди зводиться і 2024.

const COIN_BY_ENGLISH: Record<string, string> = {
  CP: "мм",
  SP: "см",
  EP: "ем",
  GP: "зм",
  PP: "пм",
};

export const translateWeight = (value: string): string => value.replace(/\blb\./gi, "фнт.");

export const translateCost = (value: string): string =>
  value.replace(/\b(CP|SP|EP|GP|PP)\b/g, (coin) => COIN_BY_ENGLISH[coin]);

export const translateDonDoffTime = (value: string): string => {
  if (/^utilize action$/i.test(value.trim())) return "Дія Застосування";
  return value.replace(/(\d+)\s+minutes?/gi, (_, count: string) => `${count} ${pluralizeMinutes(Number(count))}`);
};

const pluralizeMinutes = (count: number): string => {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "хвилин";
  if (last === 1) return "хвилина";
  if (last >= 2 && last <= 4) return "хвилини";
  return "хвилин";
};
