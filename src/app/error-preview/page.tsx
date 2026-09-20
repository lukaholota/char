import { notFound } from "next/navigation";

import { ErrorPreview } from "./ErrorPreview";

export const dynamic = "force-dynamic";

export default function ErrorPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return <ErrorPreview />;
}
