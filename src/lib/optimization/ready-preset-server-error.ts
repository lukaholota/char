export const SIGN_IN_REQUIRED_MESSAGE = "Увійдіть, щоб створити персонажа. Ваші вибори збережені.";
export const SERVER_REJECTED_MESSAGE = "Сервер не прийняв вибори персонажа. Перевірте їх і спробуйте ще раз.";
export const SERVER_FAILED_MESSAGE = "Сервер не зміг зберегти персонажа. Нічого не збережено — спробуйте ще раз.";

const CYRILLIC_LETTER = /[Ѐ-ӿ]/;
const DATABASE_FAILURE = /database error|prisma|foreign key|constraint/i;
const TIMEOUT_MARK = "тривало занадто довго";
const STALE_BUILD_PREFIX = "Білд або його ревізію не знайдено";

export type PresetFailureReason = "sign_in_required" | "timeout" | "rejected" | "network" | "server";

export function findServerErrorReason(error: string): Exclude<PresetFailureReason, "network"> {
  if (error === "Unauthorized") return "sign_in_required";
  if (DATABASE_FAILURE.test(error)) return "server";
  return error.includes(TIMEOUT_MARK) ? "timeout" : "rejected";
}

export function findThrownErrorReason(failure: Error): "network" | "server" {
  return failure instanceof TypeError ? "network" : "server";
}

export function describeServerError(error: string): string {
  const reason = findServerErrorReason(error);
  if (reason === "sign_in_required") return SIGN_IN_REQUIRED_MESSAGE;
  if (reason === "server") return SERVER_FAILED_MESSAGE;
  if (error.startsWith(STALE_BUILD_PREFIX)) return `${error}. Оновіть сторінку.`;
  return CYRILLIC_LETTER.test(error) ? error : SERVER_REJECTED_MESSAGE;
}

export function isSignInRequiredMessage(message: string): boolean {
  return message === SIGN_IN_REQUIRED_MESSAGE;
}
