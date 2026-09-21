import { describe, expect, it } from "vitest";
import {
  getQaCredentialsConfig,
  hashQaPassword,
  verifyQaCredentials,
} from "@/lib/auth/qa-credentials";

const salt = "qa-test-salt";
const password = "correct horse battery staple";
const passwordHash = hashQaPassword(password, salt).toString("base64");

describe("QA credentials", () => {
  it("stays disabled unless explicitly enabled", () => {
    expect(getQaCredentialsConfig({})).toBeNull();
  });

  it("requires every secret when enabled", () => {
    expect(() =>
      getQaCredentialsConfig({ QA_CREDENTIALS_AUTH_ENABLED: "true" }),
    ).toThrow("QA credentials auth is enabled");
  });

  it("accepts only the configured email and password", () => {
    const config = getQaCredentialsConfig({
      QA_CREDENTIALS_AUTH_ENABLED: "true",
      QA_CREDENTIALS_EMAIL: "qa@example.test",
      QA_CREDENTIALS_PASSWORD_SALT: salt,
      QA_CREDENTIALS_PASSWORD_HASH: passwordHash,
    });

    expect(config).not.toBeNull();
    expect(verifyQaCredentials(config!, "QA@example.test", password)).toBe(true);
    expect(verifyQaCredentials(config!, "qa@example.test", "wrong password")).toBe(false);
    expect(verifyQaCredentials(config!, "other@example.test", password)).toBe(false);
  });
});
