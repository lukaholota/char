/**
 * Блок ідентифікаторів під магічні предмети 2024.
 *
 * Каталог 2024 живе у файлі (`data/2024/normalized/magic-items.json`, [Р28]), а `pers_magic_item`
 * посилається на `magic_item.magic_item_id`. Щоб файл і таблиця називали той самий предмет тим
 * самим числом, id 2024 пінуються у файлі й нижче за 20000 не спускаються. Автоінкремент у цей
 * блок не заходить: сіди виставляють послідовність під найбільший id ПОЗА блоком.
 */
export const RESERVED_2024_ID_BASE = 20000;

export const isReserved2024Id = (magicItemId: number): boolean => magicItemId > RESERVED_2024_ID_BASE;

/// Послідовність не можна ставити на глобальний max: після сіду 2024 це 20445, і наступна
/// автоінкрементна вставка сіла б на 20446 — тобто на id 446-го предмета 2024.
export const MAGIC_ITEM_SEQUENCE_RESET_SQL = `
  SELECT setval(
    pg_get_serial_sequence('magic_item', 'magic_item_id'),
    GREATEST(1, (SELECT coalesce(max(magic_item_id), 0) FROM magic_item WHERE magic_item_id <= ${RESERVED_2024_ID_BASE}))
  )
`;
