"use client";

import dynamic from "next/dynamic";

// На старті всі закриті, а разом із markdown-рендерером це сотні КБ коду в кожній сторінці.
// Заклинання, відкрите адресою (?spell=), модалка підхоплює з URL, щойно змонтується.
const SpellInfoModal = dynamic(() => import("@/lib/components/characterSheet/SpellInfoModal").then((module) => module.SpellInfoModal), { ssr: false });
const TermInfoModal = dynamic(() => import("@/components/rules/TermInfoModal").then((module) => module.TermInfoModal), { ssr: false });
const OmniSearchDialog = dynamic(() => import("@/components/search/OmniSearchDialog").then((module) => module.OmniSearchDialog), { ssr: false });

export function GlobalModals() {
  return (
    <>
      <SpellInfoModal />
      <TermInfoModal />
      <OmniSearchDialog />
    </>
  );
}
