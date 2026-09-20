const SITE_OWNER_EMAILS = ["lukagolota1@gmail.com"];

export const SITE_OWNER_BADGE = "Власник сайту";

export function isSiteOwnerEmail(email: string | null | undefined): boolean {
  return SITE_OWNER_EMAILS.includes(String(email ?? "").trim().toLowerCase());
}
