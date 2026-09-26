import { describe, it, expect } from "vitest";
import { $Enums } from "@prisma/client";

import * as lightEnums from "@/lib/prisma-enums";

/// Клієнт читає enum-и з легкого модуля, щоб не тягнути рушій Prisma в браузер (KR46.2). Модуль
/// генерується з клієнта Prisma; якщо після `prisma generate` його не перегенерували, браузер
/// бачить старий набір значень, а сервер — новий.
describe("src/lib/prisma-enums.ts дзеркалить enum-и @prisma/client", () => {
  const prismaEnums = $Enums as Record<string, Record<string, string>>;
  const mirrored = lightEnums as Record<string, Record<string, string>>;

  it("той самий набір enum-ів", () => {
    expect(Object.keys(mirrored).sort()).toEqual(Object.keys(prismaEnums).sort());
  });

  it("ті самі значення в тому самому порядку", () => {
    for (const [name, values] of Object.entries(prismaEnums)) {
      expect(Object.entries(mirrored[name]), name).toEqual(Object.entries(values));
    }
  });
});
