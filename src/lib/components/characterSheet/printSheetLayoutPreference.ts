import type { SheetLayout } from "@/server/pdf/types";

const STORAGE_KEY = "print:sheet-layout";

export function readRememberedSheetLayout(): SheetLayout {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "SHEET_2024" ? "SHEET_2024" : "CLASSIC";
  } catch {
    return "CLASSIC";
  }
}

export function rememberSheetLayout(layout: SheetLayout) {
  try {
    window.localStorage.setItem(STORAGE_KEY, layout);
  } catch {
    return;
  }
}
