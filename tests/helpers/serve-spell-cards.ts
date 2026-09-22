import { vi } from "vitest";
import { GET } from "@/app/spell-cards/[edition]/[key]/route";

const SPELL_CARD_PATH = /^\/spell-cards\/([^/]+)\/([^/]+)$/;

/** jsdom не має сервера: картки заклинань віддає той самий обробник маршруту, що й на проді. */
export function serveSpellCardsFromRoute(): void {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://localhost");
    const match = SPELL_CARD_PATH.exec(url.pathname);
    if (!match) throw new Error(`Тест не чекав запиту ${url.pathname}`);
    return GET(new Request(url), { params: Promise.resolve({ edition: match[1], key: match[2] }) });
  });
}
