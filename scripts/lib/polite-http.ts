const USER_AGENT = "char.holota.family content importer (contact: https://char.holota.family)";

export const DEFAULT_PAUSE_MS = 700;

export async function pause(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchTextPolitely(
  url: string,
  options: { body?: string; retries?: number } = {}
): Promise<string> {
  const retries = options.retries ?? 3;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await requestText(url, options.body);
    } catch (error) {
      if (attempt === retries) throw error;
      await pause(DEFAULT_PAUSE_MS * attempt * 2);
    }
  }

  throw new Error(`unreachable: ${url}`);
}

async function requestText(url: string, body?: string): Promise<string> {
  const response = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "User-Agent": USER_AGENT,
      ...(body === undefined ? {} : { "Content-Type": "application/x-www-form-urlencoded" }),
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }

  return await response.text();
}

export function encodeFormFields(fields: Array<[string, string]>): string {
  return fields
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join("&");
}
