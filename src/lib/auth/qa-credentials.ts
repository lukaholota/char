import { scryptSync, timingSafeEqual } from "node:crypto";

const PASSWORD_HASH_BYTES = 64;

type Environment = Record<string, string | undefined>;

export type QaCredentialsConfig = {
  email: string;
  passwordSalt: string;
  passwordHash: Buffer;
};

export function getQaCredentialsConfig(
  environment: Environment = process.env,
): QaCredentialsConfig | null {
  if (environment.QA_CREDENTIALS_AUTH_ENABLED !== "true") {
    return null;
  }

  const email = environment.QA_CREDENTIALS_EMAIL?.trim().toLowerCase();
  const passwordSalt = environment.QA_CREDENTIALS_PASSWORD_SALT;
  const passwordHash = environment.QA_CREDENTIALS_PASSWORD_HASH;

  if (!email || !passwordSalt || !passwordHash) {
    throw new Error(
      "QA credentials auth is enabled but its email, password salt, or password hash is missing.",
    );
  }

  return { email, passwordSalt, passwordHash: decodePasswordHash(passwordHash) };
}

export function hashQaPassword(password: string, passwordSalt: string): Buffer {
  return scryptSync(password, passwordSalt, PASSWORD_HASH_BYTES);
}

export function verifyQaCredentials(
  config: QaCredentialsConfig,
  email: string,
  password: string,
): boolean {
  const passwordMatches = timingSafeEqual(
    hashQaPassword(password, config.passwordSalt),
    config.passwordHash,
  );
  return email.trim().toLowerCase() === config.email && passwordMatches;
}

function decodePasswordHash(passwordHash: string): Buffer {
  const decodedPasswordHash = Buffer.from(passwordHash, "base64");
  if (decodedPasswordHash.length !== PASSWORD_HASH_BYTES) {
    throw new Error("QA credentials password hash must be a base64-encoded 64-byte scrypt hash.");
  }
  return decodedPasswordHash;
}
