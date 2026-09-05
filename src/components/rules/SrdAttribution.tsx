import type { SrdAttributionText } from "@/lib/refs/srd-attribution";

/// `page` — окремий рядок під сторінкою довідника; `inline` — усередині підвалу головної, де
/// відступи й колір задає сам підвал.
type SrdAttributionVariant = "page" | "inline";

const PARAGRAPH_CLASSES: Record<SrdAttributionVariant, string> = {
  page: "mx-auto max-w-7xl px-4 pb-10 text-center text-xs text-slate-500",
  inline: "",
};

const LINK_CLASSES: Record<SrdAttributionVariant, string> = {
  page: "underline hover:text-slate-300",
  inline: "text-slate-100 underline underline-offset-4 hover:text-slate-50",
};

export function SrdAttribution({
  attribution,
  variant = "page",
}: {
  attribution: SrdAttributionText;
  variant?: SrdAttributionVariant;
}) {
  return (
    <p className={PARAGRAPH_CLASSES[variant]}>
      {attribution.text}{" "}
      <a
        href={attribution.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={LINK_CLASSES[variant]}
      >
        {attribution.sourceName}
      </a>
      {" · "}
      <a
        href={attribution.licenseUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={LINK_CLASSES[variant]}
      >
        {attribution.licenseName}
      </a>
    </p>
  );
}
