import { fireEvent, screen, within } from "@testing-library/react";

export const section = (name: string) => within(screen.getAllByRole("region", { name })[0]);
export const sheet = () => within(screen.getByRole("dialog"));

export function openAddSheet(sectionName: string) {
  fireEvent.click(section(sectionName).getByRole("button", { name: `Додати: ${sectionName}` }));
}

export function closeSheet() {
  fireEvent.click(sheet().getByRole("button", { name: "Готово" }));
}

export function pickSpell(sectionName: string, spellName: string) {
  openAddSheet(sectionName);
  fireEvent.click(sheet().getByRole("button", { name: new RegExp(`^${spellName}`) }));
  closeSheet();
}

export function openReplaceSheet(sectionName: string, spellName: string) {
  fireEvent.click(section(sectionName).getByRole("button", { name: `${spellName}: замінити або прибрати` }));
}

export function removeSpell(sectionName: string, spellName: string) {
  openReplaceSheet(sectionName, spellName);
  fireEvent.click(sheet().getByRole("button", { name: `Прибрати «${spellName}»` }));
}

export function listOfferedSpells(sectionName: string): Array<string | null> {
  openAddSheet(sectionName);
  const names = sheet().getAllByRole("button", { pressed: false }).map((button) => button.getAttribute("aria-label"));
  closeSheet();
  return names;
}
