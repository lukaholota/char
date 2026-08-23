import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isRules2024Allowed } from "@/rules/access";
import { Home2024Client } from "./Home2024Client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "D&D 2024 — ДнД українською",
  description: "char.holota.family — простір правил D&D 5e 2024 року. Створюй персонажа за правилами PHB 2024, переглядай 2024-заклинання та предмети українською.",
};

export default async function Page() {
  const session = await auth();
  if (!isRules2024Allowed(session?.user)) {
    redirect("/");
  }

  return <Home2024Client />;
}
