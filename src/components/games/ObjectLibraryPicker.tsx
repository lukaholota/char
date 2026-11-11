"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { listObjectLibraryAction } from "@/lib/actions/game-sessions";
import { buildMediaImageUrl } from "@/lib/media-url";
import {
  buildLibraryObjectKey,
  OBJECT_LIBRARY_CATEGORIES,
  type LibraryObject,
} from "@/lib/refs/object-library";
import { cn } from "@/lib/utils";
import { useTokenDrag } from "./use-token-drag";

type Point = { clientX: number; clientY: number };
type Props = {
  onPick: (imageKey: string, widthCells: number, dropPoint?: Point) => void;
  canDropAt: (point: Point) => boolean;
};

const TOUCH_HOLD_MS = 250;

let libraryRequest: ReturnType<typeof listObjectLibraryAction> | null = null;

/// Каталог вантажиться раз на вкладку браузера; невдалий запит не кешується, щоб «Спробувати ще раз» пішло на сервер.
function loadObjectLibrary() {
  libraryRequest ??= listObjectLibraryAction().then(
    (result) => {
      if (!result.ok) libraryRequest = null;
      return result;
    },
    (error: unknown) => {
      libraryRequest = null;
      throw error;
    },
  );
  return libraryRequest;
}

function useObjectLibrary() {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{
    attempt: number;
    objects: readonly LibraryObject[] | null;
  } | null>(null);
  useEffect(() => {
    let isCurrent = true;
    loadObjectLibrary().then(
      (result) =>
        isCurrent &&
        setLoaded({ attempt, objects: result.ok ? result.value : null }),
      () => isCurrent && setLoaded({ attempt, objects: null }),
    );
    return () => {
      isCurrent = false;
    };
  }, [attempt]);
  return {
    objects: loaded?.attempt === attempt ? loaded.objects : undefined,
    retry: () => setAttempt((count) => count + 1),
  };
}

/// Дотик ставить обʼєкт у центр видимої мапи; його можна й перетягнути на потрібне місце — пальцем після короткого утримання.
export function ObjectLibraryPicker({ onPick, canDropAt }: Props) {
  const { objects, retry } = useObjectLibrary();
  const [category, setCategory] = useState(OBJECT_LIBRARY_CATEGORIES[0].id);
  const pick = (object: LibraryObject, dropPoint?: Point) =>
    onPick(buildLibraryObjectKey(object.slug), object.widthCells, dropPoint);
  const drag = useTokenDrag<LibraryObject>(
    (object, point) => canDropAt(point) && pick(object, point),
    canDropAt,
    (object) => pick(object),
    TOUCH_HOLD_MS,
  );
  if (objects === undefined)
    return <p className="text-sm text-slate-400">Завантажуємо набір…</p>;
  if (objects === null) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="alert" className="text-sm text-rose-200">
          Не вдалося відкрити набір обʼєктів.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={retry}
          className="h-11"
        >
          Спробувати ще раз
        </Button>
      </div>
    );
  }
  const label =
    OBJECT_LIBRARY_CATEGORIES.find((item) => item.id === category)?.label ?? "";
  const shown = objects.filter((object) => object.category === category);
  return (
    <div className="space-y-2">
      <select
        value={category}
        onChange={(event) => setCategory(event.target.value)}
        aria-label="Категорія обʼєктів"
        className="h-11 w-full rounded-xl border border-white/15 bg-slate-950 px-3 text-base text-slate-100"
      >
        {OBJECT_LIBRARY_CATEGORIES.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      {shown.length === 0 ? (
        <p className="text-sm text-slate-400">У цій категорії поки порожньо.</p>
      ) : null}
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {shown.map((object, index) => {
          const imageKey = buildLibraryObjectKey(object.slug);
          return (
            <li key={object.slug}>
              <button
                type="button"
                aria-label={`Поставити: ${label}, ${index + 1}`}
                onClick={(event) => event.detail === 0 && pick(object)}
                {...drag.bindToken(object)}
                className="block aspect-square w-full min-h-11 select-none rounded-xl border border-white/10 bg-stone-400 p-1 [-webkit-touch-callout:none] hover:border-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-arcane-300"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- мініатюра вже стиснута скриптом набору */}
                <img
                  src={buildMediaImageUrl(imageKey, "thumbnail")}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={96}
                  height={96}
                  draggable={false}
                  className="h-full w-full object-contain"
                />
              </button>
            </li>
          );
        })}
      </ul>
      {drag.ghost ? (
        // eslint-disable-next-line @next/next/no-img-element -- та сама мініатюра, що й у списку
        <img
          src={buildMediaImageUrl(
            buildLibraryObjectKey(drag.ghost.id.slug),
            "thumbnail",
          )}
          alt=""
          aria-hidden
          className={cn(
            "pointer-events-none fixed z-[10000] h-16 w-16 -translate-x-1/2 -translate-y-1/2 object-contain",
            !drag.ghost.isOverTarget && "opacity-60",
          )}
          style={{ left: drag.ghost.clientX, top: drag.ghost.clientY }}
        />
      ) : null}
    </div>
  );
}
