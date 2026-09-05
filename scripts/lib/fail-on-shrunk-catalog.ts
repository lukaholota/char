/// Кожен каталог у `src/lib/generated/` лежить у `.gitignore` і з git не відновлюється, а
/// `generate:content` висить на `prebuild` і в обох джобах CI. Тому база, у якій бракує рядків,
/// мовчки стирає публічні сторінки — рівно так каталог предметів уже втратив 225 записів
/// (docs/o14-magic-items-aidedd/kr14.1-single-source.md) і рівно так `PADDED` втратив свою
/// сторінку, коли опинився в `RULES_2024` (KR16.5).
///
/// Поріг рухають **угору** разом із каталогом і ніколи не прибирають: межа, нижча за поточний
/// каталог, — не гард, а декорація. Недобір лагодять сідом, не генератором.
export function failOnShrunkCatalog(catalog: string, actual: number, minimum: number, remedy = ""): void {
  if (actual >= minimum) return;

  throw new Error(
    `Каталог «${catalog}» схлопнувся: джерело віддало ${actual}, очікували щонайменше ${minimum}. ` +
      "Файл НЕ перезаписано." +
      (remedy ? `\n${remedy}` : "")
  );
}
