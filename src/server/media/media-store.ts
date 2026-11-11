import { AwsClient } from "aws4fetch";

const MEDIA_REQUEST_TIMEOUT_MS = 60_000;

type MediaStoreConfig = { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string };

export function isMediaStoreConfigured(): boolean {
  return readMediaStoreConfig() !== null;
}

export async function putMediaObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
  const response = await sendMediaRequest(key, {
    method: "PUT",
    body: new Blob([body.slice()]),
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
  if (!response.ok) throw new Error(`R2 PUT ${key}: ${response.status}`);
}

export async function hasMediaObject(key: string): Promise<boolean> {
  const response = await sendMediaRequest(key, { method: "HEAD" });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error(`R2 HEAD ${key}: ${response.status}`);
  return true;
}

export async function deleteMediaObject(key: string): Promise<void> {
  const response = await sendMediaRequest(key, { method: "DELETE" });
  if (!response.ok && response.status !== 404) throw new Error(`R2 DELETE ${key}: ${response.status}`);
}

function sendMediaRequest(key: string, init: RequestInit): Promise<Response> {
  const config = readMediaStoreConfig();
  if (!config) throw new Error("Сховище картинок не налаштоване");
  const client = new AwsClient({ accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey, service: "s3", region: "auto" });
  return client.fetch(`https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}/${key}`, { ...init, signal: AbortSignal.timeout(MEDIA_REQUEST_TIMEOUT_MS) });
}

function readMediaStoreConfig(): MediaStoreConfig | null {
  const { R2_MEDIA_ACCOUNT_ID, R2_MEDIA_ACCESS_KEY_ID, R2_MEDIA_SECRET_ACCESS_KEY, R2_MEDIA_BUCKET } = process.env;
  if (!R2_MEDIA_ACCOUNT_ID || !R2_MEDIA_ACCESS_KEY_ID || !R2_MEDIA_SECRET_ACCESS_KEY || !R2_MEDIA_BUCKET) return null;
  return { accountId: R2_MEDIA_ACCOUNT_ID, accessKeyId: R2_MEDIA_ACCESS_KEY_ID, secretAccessKey: R2_MEDIA_SECRET_ACCESS_KEY, bucket: R2_MEDIA_BUCKET };
}
