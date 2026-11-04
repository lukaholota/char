import { create } from "zustand";

type DocumentPictureInPicture = { requestWindow: (options: { width: number; height: number }) => Promise<Window> };

const POPOUT_SIZE = { width: 340, height: 560 };

export const useJournalPopoutStore = create<{ popout: Window | null }>(() => ({ popout: null }));

export function canPopOutJournal(): boolean {
  return typeof window !== "undefined" && "documentPictureInPicture" in window;
}

export function isJournalPoppedOut(): boolean {
  return useJournalPopoutStore.getState().popout !== null;
}

/// Вікно «картинка в картинці» лежить поверх інших програм і буває вужчим, ніж дозволяє звичайне вікно браузера.
export async function popOutJournal(): Promise<void> {
  const picture = (window as Window & { documentPictureInPicture?: DocumentPictureInPicture }).documentPictureInPicture;
  if (!picture || isJournalPoppedOut()) return;
  const popout = await picture.requestWindow(POPOUT_SIZE);
  copyPageLook(popout.document);
  popout.addEventListener("pagehide", () => useJournalPopoutStore.setState({ popout: null }), { once: true });
  useJournalPopoutStore.setState({ popout });
}

export function closeJournalPopout() {
  useJournalPopoutStore.getState().popout?.close();
}

function copyPageLook(target: Document) {
  for (const node of document.head.querySelectorAll('link[rel="stylesheet"], style')) {
    if (node instanceof HTMLLinkElement) {
      const link = target.createElement("link");
      link.rel = "stylesheet";
      link.href = node.href;
      target.head.append(link);
    } else {
      target.head.append(target.importNode(node, true));
    }
  }
  for (const { name, value } of document.documentElement.attributes) target.documentElement.setAttribute(name, value);
  target.body.className = document.body.className;
  target.title = "Журнал кімнати";
}
