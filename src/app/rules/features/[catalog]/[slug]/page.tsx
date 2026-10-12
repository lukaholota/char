import { notFound } from "next/navigation";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { ModeLink } from "@/components/no-ai/ModeLink";
import { collectSupplementalReferences } from "@/lib/optimization/supplemental-hydration";

const catalogs: Record<string, string> = { classes: "Класи", races: "Раси", feats: "Риси", equipment: "Спорядження" };

export default async function FeatureDescriptionPage({ params }: {
  params: Promise<{ catalog: string; slug: string }>;
}) {
  const { catalog, slug } = await params;
  if (!Object.hasOwn(catalogs, catalog)) notFound();
  const matches = collectSupplementalReferences("RULES_2014", [])
    .filter((reference) => reference.href === `/${catalog}?reference=${slug}`);
  if (!matches.length) notFound();
  // Reviewed source-complete descriptions supersede older seed versions of the same ability.
  const reviewed = matches.filter((reference) => reference.details.some((detail) => detail.label === "Джерело"));
  const references = reviewed.length ? reviewed : matches;

  return <article className="mx-auto max-w-3xl space-y-6 p-6">
    <ModeLink href={catalog === "equipment" ? "/rules" : `/${catalog}`} className="text-amber-200 underline">{catalogs[catalog]}</ModeLink>
    <h1 className="text-3xl">{references[0].name}</h1>
    <p className="font-mono text-sm text-slate-400">{references[0].engName}</p>
    {references.map((reference, index) => <section key={index} className="space-y-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        {reference.details.map((detail) => <div key={detail.label} className="contents"><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}
      </dl>
      <FormattedDescription content={reference.description ?? ""} />
    </section>)}
  </article>;
}
