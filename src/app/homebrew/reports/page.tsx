import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomebrewPageShell } from "@/components/homebrew/HomebrewPageShell";
import { ReportQueue } from "@/components/discussion/ReportQueue";
import { listOpenContentReports } from "@/lib/actions/content-report-actions";

export const metadata: Metadata = { title: "Скарги — хоумбрю спільноти", robots: { index: false } };

export default async function HomebrewReportsPage() {
  const reports = await listOpenContentReports();
  if (!reports) notFound();

  return (
    <HomebrewPageShell title="Скарги" backHref="/homebrew" backLabel="Хоумбрю">
      <ReportQueue reports={reports} />
    </HomebrewPageShell>
  );
}
