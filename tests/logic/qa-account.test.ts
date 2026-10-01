import { describe, expect, it } from "vitest";
import { getQaAccountEmail, QA_ACCOUNT_EMAIL } from "@/lib/auth/qa-account";

describe("QA account configuration", () => {
  it("requires the fixed synthetic account email", () => {
    expect(getQaAccountEmail({})).toBeNull();
    expect(getQaAccountEmail({ QA_CREDENTIALS_EMAIL: "player@example.test" })).toBeNull();
    expect(getQaAccountEmail({ QA_CREDENTIALS_EMAIL: ` ${QA_ACCOUNT_EMAIL.toUpperCase()} ` })).toBe(QA_ACCOUNT_EMAIL);
  });
});
