"use client";

import { useEffect, useState } from "react";
import { listImageLibraryAction } from "@/lib/actions/game-image-library";
import { listTokenImagesAction } from "@/lib/actions/game-token-images";

type Library = { folders: Array<{ id: number; name: string }>; images: Array<{ imageKey: string; folderId: number | null }> };

export function useImageLibrary(withFolders: boolean) {
  const [library, setLibrary] = useState<Library | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const load = async () => {
    setHasFailed(false);
    if (withFolders) {
      const result = await listImageLibraryAction().catch(() => null);
      if (result?.ok) setLibrary(result.value);
      else setHasFailed(true);
    } else {
      const result = await listTokenImagesAction().catch(() => null);
      if (result?.ok) setLibrary({ folders: [], images: result.value.map((imageKey) => ({ imageKey, folderId: null })) });
      else setHasFailed(true);
    }
  };
  useEffect(() => { void load(); }, [withFolders]); // eslint-disable-line react-hooks/exhaustive-deps

  return { library, hasFailed, load, setLibrary };
}
