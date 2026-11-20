import { createContext } from "react";

/// Лист дає кубикам в описі предмета запас зарядів; startRoll знімає ціну дії й ховає картку, false — кидка не буде.
/// Без нього (каталог) кубики лишаються текстом.
export type ItemRollUse = { chargesLeft: number | null; isPending: boolean; startRoll: (chargeCost: number) => Promise<boolean> };

export const ItemRollUseContext = createContext<ItemRollUse | null>(null);
