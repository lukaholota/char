import { useCallback, useEffect, useState } from "react";

type GenderKey = "male" | "female";

type GenderNamePool = {
  names: { traditional: readonly string[]; fantasy: readonly string[] };
  surnames: { traditional: readonly string[]; fantasy: readonly string[] };
  patronymics: readonly string[];
};

type NamePools = Record<GenderKey, GenderNamePool>;

type NameGeneratorOptions = {
  gender?: "any" | GenderKey;
  sources?: {
    traditional?: boolean;
    fantasy?: boolean;
  };
  parts?: {
    name?: boolean;
    surname?: boolean;
    patronymic?: boolean;
  };
};

function getRandomIndex(max: number) {
  if (max <= 0) return 0;
  try {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % max;
  } catch {
    return Math.floor(Math.random() * max);
  }
}

function pickOne<T>(list: readonly T[]) {
  if (!list.length) return undefined;
  return list[getRandomIndex(list.length)];
}

function pickGender(preferred?: "any" | GenderKey): GenderKey {
  if (preferred === "male" || preferred === "female") return preferred;
  return getRandomIndex(2) === 0 ? "male" : "female";
}

function buildPartsOrder(options: { name: boolean; surname: boolean; patronymic: boolean }) {
  const { name, surname, patronymic } = options;

  if (surname && name && patronymic) return ["surname", "name", "patronymic"] as const;
  if (name && surname) return ["name", "surname"] as const;
  if (name && patronymic) return ["name", "patronymic"] as const;
  if (surname && patronymic) return ["surname", "patronymic"] as const;
  if (surname) return ["surname"] as const;
  if (patronymic) return ["patronymic"] as const;
  return ["name"] as const;
}

// Сотня КБ списків потрібна лише на кроці «Імʼя», тож вони не йдуть у код конструктора.
let namePoolsPromise: Promise<NamePools> | null = null;

function loadNamePools(): Promise<NamePools> {
  namePoolsPromise ??= Promise.all([
    import("@/lib/refs/names"),
    import("@/lib/refs/surnames"),
    import("@/lib/refs/patronymics"),
  ]).then(([names, surnames, patronymics]) => ({
    male: {
      names: { traditional: names.maleNames, fantasy: names.maleFantasyNames },
      surnames: { traditional: surnames.maleSurnames, fantasy: surnames.fantasySurnamesMale },
      patronymics: patronymics.malePatronymics,
    },
    female: {
      names: { traditional: names.femaleNames, fantasy: names.femaleFantasyNames },
      surnames: { traditional: surnames.femaleSurnames, fantasy: surnames.fantasySurnamesFemale },
      patronymics: patronymics.femalePatronymics,
    },
  }));
  return namePoolsPromise;
}

function useNamePools(): NamePools | null {
  const [pools, setPools] = useState<NamePools | null>(null);

  useEffect(() => {
    let isMounted = true;
    void loadNamePools().then((loaded) => {
      if (isMounted) setPools(loaded);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return pools;
}

export function useFantasyNameGenerator(options?: NameGeneratorOptions) {
  const pools = useNamePools();

  const generateRandomName = useCallback(() => {
    if (!pools) return "";
    const gender = pickGender(options?.gender);
    const pool = pools[gender];

    const allowTraditional = options?.sources?.traditional ?? true;
    const allowFantasy = options?.sources?.fantasy ?? true;
    const useTraditional = allowTraditional || !allowFantasy;
    const useFantasy = allowFantasy || !allowTraditional;

    const includeName = options?.parts?.name ?? true;
    const includeSurname = options?.parts?.surname ?? true;
    const includePatronymic = options?.parts?.patronymic ?? false;

    const namePool = [
      ...(useTraditional ? pool.names.traditional : []),
      ...(useFantasy ? pool.names.fantasy : []),
    ];
    const surnamePool = [
      ...(useTraditional ? pool.surnames.traditional : []),
      ...(useFantasy ? pool.surnames.fantasy : []),
    ];

    const name = pickOne(namePool) ?? "";
    const surname = pickOne(surnamePool) ?? "";
    const patronymic = pickOne(pool.patronymics) ?? "";

    const chosen = buildPartsOrder({
      name: includeName,
      surname: includeSurname,
      patronymic: includePatronymic,
    });

    const resolved = chosen
      .map((part) => {
        if (part === "name") return name;
        if (part === "surname") return surname;
        return patronymic;
      })
      .filter(Boolean)
      .join(" ");

    return resolved || name;
  }, [options?.gender, options?.parts?.name, options?.parts?.surname, options?.parts?.patronymic, options?.sources?.fantasy, options?.sources?.traditional, pools]);

  const [currentName, setCurrentName] = useState<string>("");

  const generateName = useCallback(() => {
    const next = generateRandomName();
    setCurrentName(next);
    return next;
  }, [generateRandomName]);

  useEffect(() => {
    setCurrentName(generateRandomName());
  }, [generateRandomName]);

  return { currentName, generateName };
}
