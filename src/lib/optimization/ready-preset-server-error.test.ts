import { describe, expect, it } from "vitest";
import {
  SERVER_FAILED_MESSAGE, SERVER_REJECTED_MESSAGE, SIGN_IN_REQUIRED_MESSAGE,
  describeServerError, findServerErrorReason, findThrownErrorReason, isSignInRequiredMessage,
} from "./ready-preset-server-error";

describe("describeServerError", () => {
  it("asks an anonymous visitor to sign in and says the choices are kept", () => {
    expect(describeServerError("Unauthorized")).toBe("Увійдіть, щоб створити персонажа. Ваші вибори збережені.");
    expect(isSignInRequiredMessage(describeServerError("Unauthorized"))).toBe(true);
  });

  it.each(["Validation failed", "Race not found", "Class not found", "Background not found", "User not found", "Something broke"])("hides the English server text %s", (error) => {
    expect(describeServerError(error)).toBe(SERVER_REJECTED_MESSAGE);
    expect(isSignInRequiredMessage(describeServerError(error))).toBe(false);
  });

  it.each(["Database error", "Foreign key constraint violated on the constraint: `PersSpell_spellId_fkey`", "Invalid `prisma.pers.create()` invocation"])("tells the player nothing was saved after a database failure: %s", (error) => {
    expect(describeServerError(error)).toBe(SERVER_FAILED_MESSAGE);
    expect(SERVER_FAILED_MESSAGE).toContain("Нічого не збережено — спробуйте ще раз");
  });

  it("asks to reload the page when the build revision is gone", () => {
    expect(describeServerError("Білд або його ревізію не знайдено для правил 2014")).toBe("Білд або його ревізію не знайдено для правил 2014. Оновіть сторінку.");
  });

  it("keeps Ukrainian server messages as they are", () => {
    expect(describeServerError("Рівень 19: Обране заклинання не з вашого списку класу або зависокого рівня")).toBe("Рівень 19: Обране заклинання не з вашого списку класу або зависокого рівня");
    expect(describeServerError("Оберіть заклинань до книги: 6")).toBe("Оберіть заклинань до книги: 6");
  });

  it("does not turn the sign-in text into a generic one", () => {
    expect(SIGN_IN_REQUIRED_MESSAGE).not.toBe(SERVER_REJECTED_MESSAGE);
  });
});

describe("failure reasons", () => {
  it.each([
    ["Unauthorized", "sign_in_required"],
    ["Database error", "server"],
    ["Створення тривало занадто довго, і сервер його скасував. Нічого не збережено — спробуйте ще раз.", "timeout"],
    ["Validation failed", "rejected"],
    ["Оберіть заклинань до книги: 6", "rejected"],
    ["Білд або його ревізію не знайдено для правил 2014", "rejected"],
  ] as const)("reads %s as %s", (error, reason) => {
    expect(findServerErrorReason(error)).toBe(reason);
  });

  it("separates a lost connection from a server crash", () => {
    expect(findThrownErrorReason(new TypeError("Failed to fetch"))).toBe("network");
    expect(findThrownErrorReason(new Error("An unexpected response was received from the server."))).toBe("server");
  });
});
