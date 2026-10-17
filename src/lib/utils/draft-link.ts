import { z } from "zod";
import { fullCharacterSchema, type PersFormData } from "@/lib/zod/schemas/persCreateSchema";

export type LinkedDraftScope = "CREATOR_2014" | "CREATOR_2024" | "PRESET_2014" | `PRESET_2014:${string}`;

export interface LinkedDraft {
  scope: LinkedDraftScope;
  formData: Partial<PersFormData>;
  currentStep: number;
  totalSteps: number;
}

const DRAFT_LINK_VERSION = 1;
export const MAX_ENCODED_DRAFT_LENGTH = 16_384;
export const MAX_DRAFT_JSON_BYTES = 65_536;

const formDataShape = fullCharacterSchema.shape;
const formDataFieldsSchema = z.object(formDataShape).partial();

const linkedDraftSchema = z.object({
  v: z.literal(DRAFT_LINK_VERSION),
  s: z.string().regex(/^(?:CREATOR_2014|CREATOR_2024|PRESET_2014(?::[a-z0-9_-]{1,120})?)$/),
  d: z.object({
    formData: z.record(z.string(), z.unknown()),
    currentStep: z.number().int().min(1).max(40),
    totalSteps: z.number().int().min(1).max(40),
  }),
});

export async function encodeDraftLink(draft: LinkedDraft): Promise<string | null> {
  if (typeof CompressionStream === "undefined") return null;
  try {
    const json = JSON.stringify({ v: DRAFT_LINK_VERSION, s: draft.scope, d: { formData: draft.formData, currentStep: draft.currentStep, totalSteps: draft.totalSteps } });
    const encoded = encodeBase64Url(await deflate(new TextEncoder().encode(json)));
    return encoded.length <= MAX_ENCODED_DRAFT_LENGTH ? encoded : null;
  } catch {
    return null;
  }
}

export async function decodeDraftLink(encoded: string): Promise<LinkedDraft | null> {
  if (typeof DecompressionStream === "undefined" || encoded.length > MAX_ENCODED_DRAFT_LENGTH) return null;
  try {
    const json = await inflateWithinLimit(decodeBase64Url(encoded), MAX_DRAFT_JSON_BYTES);
    if (json === null) return null;
    return parseLinkedDraft(JSON.parse(json));
  } catch {
    return null;
  }
}

function parseLinkedDraft(value: unknown): LinkedDraft | null {
  const parsed = linkedDraftSchema.safeParse(value);
  if (!parsed.success) return null;
  const formData = dropPrototypeNamedFields(parsed.data.d.formData);
  if (!formDataFieldsSchema.safeParse(pickFinalFormFields(formData)).success) return null;
  return { scope: parsed.data.s as LinkedDraftScope, formData: formData as Partial<PersFormData>, currentStep: parsed.data.d.currentStep, totalSteps: parsed.data.d.totalSteps };
}

// Steps keep in-progress values under their own top-level keys (basicChoices, expertises, choiceGroupToId…),
// so only the fields of the final form are checked; the draft keeps raw values, not the schema's transformed output.
function pickFinalFormFields(formData: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(formData).filter(([key]) => Object.hasOwn(formDataShape, key)));
}

function dropPrototypeNamedFields(formData: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(formData).filter(([key]) => !(key in Object.prototype)));
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  void writer.write(bytes as Uint8Array<ArrayBuffer>);
  void writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

async function inflateWithinLimit(bytes: Uint8Array, maxBytes: number): Promise<string | null> {
  const stream = new DecompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  writer.write(bytes as Uint8Array<ArrayBuffer>).catch(() => {});
  writer.close().catch(() => {});
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(joinChunks(chunks, total));
}

function joinChunks(chunks: Uint8Array[], total: number): Uint8Array {
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return joined;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(encoded: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(encoded)) throw new Error("not base64url");
  const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
