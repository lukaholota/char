/// Ліцензійна умова CC BY 4.0, а не декорація. Живе окремо від rules2014Data / rules2024Data,
/// бо ті імпортують корпуси статей: підвал головної, якому потрібен лише цей рядок, тягнув через
/// них 612 КіБ JSON у клієнтський бандл (docs/STATE.md дефект №9).
export type SrdAttributionText = {
  text: string;
  licenseName: string;
  licenseUrl: string;
  sourceName: string;
  sourceUrl: string;
};

export const SRD_5_1_ATTRIBUTION: SrdAttributionText = {
  text: "Правила 2014 перекладено з System Reference Document 5.1 (Wizards of the Coast), ліцензія CC BY 4.0.",
  licenseName: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/legalcode",
  sourceName: "SRD 5.1",
  sourceUrl: "https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf",
};

export const SRD_2024_ATTRIBUTION: SrdAttributionText = {
  text: "Правила 2024 перекладено з System Reference Document 5.2.1 (Wizards of the Coast), ліцензія CC BY 4.0.",
  licenseName: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/legalcode",
  sourceName: "SRD 5.2.1",
  sourceUrl: "https://www.dndbeyond.com/srd",
};
