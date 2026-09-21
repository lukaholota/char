import { notFound } from "next/navigation";
import { getQaCredentialsConfig } from "@/lib/auth/qa-credentials";
import QaCredentialsSignInForm from "./qa-credentials-sign-in-form";

export const metadata = {
  title: "QA sign in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function QaSignInPage() {
  if (!getQaCredentialsConfig()) {
    notFound();
  }

  return <QaCredentialsSignInForm />;
}
