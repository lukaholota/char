// Текст React Flight, коли RSC-відповідь закрилася до кінця (Sentry JAVASCRIPT-NEXTJS-1P).
const CONNECTION_CLOSED_MESSAGE = "Connection closed.";

export function isConnectionClosedError(error: unknown): boolean {
  return error instanceof Error && error.name === "Error" && error.message === CONNECTION_CLOSED_MESSAGE;
}
