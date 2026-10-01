export const QA_ACCOUNT_EMAIL = "qa-browser@char.holota.family";

export function getQaAccountEmail(environment: Record<string, string | undefined> = process.env): string | null {
  return environment.QA_CREDENTIALS_EMAIL?.trim().toLowerCase() === QA_ACCOUNT_EMAIL
    ? QA_ACCOUNT_EMAIL
    : null;
}
