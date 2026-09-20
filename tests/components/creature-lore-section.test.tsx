// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CreatureLoreSection } from "@/components/bestiary/CreatureLoreSection";
import type { CreatureLoreGroup } from "@/lib/bestiaryLore";

afterEach(cleanup);

const dragons: CreatureLoreGroup = {
  key: "dragons",
  ruleset: "RULES_2014",
  name: "Дракони",
  engName: "Dragons",
  source: "MM",
  description:
    "Справжні дракони — крилаті плазуни стародавнього роду.\n\n**Скарби{{Hoards}}**\n\nУсі справжні дракони жадають багатства.",
  creatureIds: [3],
};

describe("KR33.8 — блок лору під статблоком", () => {
  it("без групи не малює нічого", () => {
    const { container } = render(<CreatureLoreSection group={null} is2024={false} />);
    expect(container.querySelector("[data-creature-lore]")).toBeNull();
  });

  it("згорнутим показує назву групи з оригіналом і перший абзац, решту — після натискання", () => {
    render(<CreatureLoreSection group={dragons} is2024={false} />);

    expect(screen.getByText("Дракони")).toBeTruthy();
    expect(screen.getByText("[Dragons]")).toBeTruthy();
    expect(screen.getByText(/крилаті плазуни/)).toBeTruthy();
    expect(screen.queryByText(/жадають багатства/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Розгорнути повністю/ }));

    expect(screen.getByText(/жадають багатства/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Згорнути/ })).toBeTruthy();
  });

  it("у 2024 підзаголовок і список середовища не заміняють першого абзацу прози", () => {
    const redDragons: CreatureLoreGroup = {
      ...dragons,
      key: "red-dragons",
      ruleset: "RULES_2024",
      description:
        "Дракони жадоби й спустошення{{Dragons of Greed and Devastation}}\n\n- **Середовище:** Гори\n- **Скарби:** Реліквії\n\nЧервоні дракони — найгрізніші з хроматичних драконів.\n\nЛігва вони облаштовують у вулканах.",
    };
    render(<CreatureLoreSection group={redDragons} is2024={true} />);

    expect(screen.getByText(/Середовище/)).toBeTruthy();
    expect(screen.getByText(/найгрізніші з хроматичних/)).toBeTruthy();
    expect(screen.queryByText(/у вулканах/)).toBeNull();
  });

  it("однoабзацний лор кнопки не показує", () => {
    render(<CreatureLoreSection group={{ ...dragons, description: "Один абзац." }} is2024={true} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
