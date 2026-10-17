import { describe, expect, it, vi } from "vitest";

const generateCharacterPdf = vi.hoisted(() => vi.fn());
const generateCharacterPdfFromData = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => ({ user: { email: "player@test.local" } })) }));
vi.mock("@/lib/actions/pers", () => ({ getPersById: vi.fn() }));
vi.mock("@/server/db/wildshape", () => ({ countAttachedForms: vi.fn(), findAttachedForms: vi.fn(async () => []) }));
vi.mock("@/lib/actions/share-actions", () => ({
  getPersByShareToken: vi.fn(),
  getPrintablePersByShareToken: vi.fn(async () => ({ pers: { persId: 7 } })),
}));
vi.mock("@/server/pdf/groupCharacterFeatures", () => ({ groupCharacterFeaturesForPdf: vi.fn(() => []) }));
vi.mock("@/server/pdf/generateCharacterPdf", () => ({ generateCharacterPdf, generateCharacterPdfFromData }));

import { generateCharacterPdfAction } from "@/app/char/[id]/print/actions";
import { generateCharacterPdfByTokenAction } from "@/app/char/share/[token]/print/actions";
import { PdfBusyError, PdfTimeoutError } from "@/server/pdf/pdfJobGate";
import type { PrintConfig } from "@/server/pdf/types";

const CONFIG: PrintConfig = { sections: ["CHARACTER"], flattenCharacterSheet: true };

describe("дія друку персонажа", () => {
  it("повертає PDF у base64", async () => {
    generateCharacterPdf.mockResolvedValueOnce(new Uint8Array([37, 80, 68, 70]));
    await expect(generateCharacterPdfAction(7, CONFIG)).resolves.toEqual({ ok: true, contentType: "application/pdf", data: "JVBERg==" });
  });

  it("повертає пояснення замість помилки, яку production сховав би", async () => {
    generateCharacterPdf.mockRejectedValueOnce(new PdfBusyError());
    await expect(generateCharacterPdfAction(7, CONFIG)).resolves.toEqual({ ok: false, error: new PdfBusyError().message });
  });

  it("пропускає інші помилки далі", async () => {
    generateCharacterPdf.mockRejectedValueOnce(new Error("Not found"));
    await expect(generateCharacterPdfAction(7, CONFIG)).rejects.toThrow("Not found");
  });
});

describe("дія друку за посиланням", () => {
  it("повертає пояснення, коли PDF збирався надто довго", async () => {
    generateCharacterPdfFromData.mockRejectedValueOnce(new PdfTimeoutError());
    await expect(generateCharacterPdfByTokenAction("token", CONFIG)).resolves.toEqual({ ok: false, error: new PdfTimeoutError().message });
  });
});
