import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MagicItemsPage from "@/app/magic-items/page";

vi.mock("@/app/magic-items/magic-items-client", () => ({ MagicItemsClient: () => <div>Звичайний каталог</div> }));
vi.mock("@/components/no-ai/ModeLink", () => ({ ModeLink: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/components/ui/FormattedDescription", () => ({ FormattedDescription: ({ content }: { content: string }) => <p>{content}</p> }));

it.each([
  ["armblade", "протягом усього часу налаштування", "с. 276"],
  ["wand-sheath", "вважаються одним магічним предметом", "с. 279"],
  ["battering-shield", "ще на 10 футів", "с. 266"],
  ["boomerang-1", "володіє метальним списом", "с. 213"],
])("renders the complete static 2014 item %s without saved character controls", async (reference, body, source) => {
  const page = await MagicItemsPage({ searchParams: Promise.resolve({ reference }) });
  const rendered = renderToStaticMarkup(page);
  expect(rendered).toContain(body);
  expect(rendered).toContain(source);
  expect(rendered).not.toContain("Звичайний каталог");
  expect(rendered).not.toContain("Додати");
});

it("keeps the normal catalog for absent or unknown references", async () => {
  for (const searchParams of [{}, { reference: "unknown-item" }, { reference: ["armblade", "wand-sheath"] }]) {
    const page = await MagicItemsPage({ searchParams: Promise.resolve(searchParams) });
    expect(renderToStaticMarkup(page)).toContain("Звичайний каталог");
  }
});
