export type LibraryObject = { slug: string; category: string; widthCells: number };

export const OBJECT_LIBRARY_KEY_PREFIX = "library/objects/";
export const buildLibraryObjectKey = (slug: string) => `${OBJECT_LIBRARY_KEY_PREFIX}${slug}`;

export const OBJECT_LIBRARY_CATEGORIES: ReadonlyArray<{ id: string; label: string }> = [
  { id: "storage", label: "Скрині, ящики, бочки" },
  { id: "tables", label: "Столи" },
  { id: "seating", label: "Стільці й лави" },
  { id: "beds", label: "Ліжка" },
  { id: "cupboards", label: "Шафи й полиці" },
  { id: "light", label: "Світло й вогонь" },
  { id: "altars", label: "Вівтарі" },
  { id: "treasure", label: "Скарби й магічні речі" },
  { id: "gear", label: "Спорядження й папери" },
  { id: "combat", label: "Бій і облога" },
  { id: "torture", label: "Кайдани й катівня" },
  { id: "burial", label: "Могили й саркофаги" },
  { id: "bones", label: "Кістки й кров" },
  { id: "webs", label: "Павутиння" },
  { id: "workshop", label: "Майстерні й алхімія" },
  { id: "statues", label: "Статуї й руїни" },
  { id: "rugs", label: "Килими" },
  { id: "carts", label: "Вози й човни" },
  { id: "trees", label: "Дерева й кущі" },
  { id: "rocks", label: "Каміння" },
  { id: "underdark", label: "Гриби й кристали" },
];
