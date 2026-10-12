"use client";

import { createContext, useContext } from "react";

export type ContentReferenceOpener = { open: (href: string) => boolean; has: (href: string) => boolean };

export const ContentReferenceContext = createContext<ContentReferenceOpener | null>(null);

export function useOpenContentReference() {
  return useContext(ContentReferenceContext);
}
