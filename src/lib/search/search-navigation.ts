/// Той самий рядок пошуку можна натиснути двічі поспіль, і вдруге адреса не зміниться — а
/// каталог має знову відкрити модалку й доїхати до потрібного пункту. Тому перехід із пошуку
/// оголошується подією: каталог слухає її, а не різницю в параметрах адреси.
const SEARCH_NAVIGATION_EVENT = "omnisearch:navigated";

export function announceSearchNavigation(): void {
  window.dispatchEvent(new Event(SEARCH_NAVIGATION_EVENT));
}

export function subscribeToSearchNavigation(listener: () => void): () => void {
  window.addEventListener(SEARCH_NAVIGATION_EVENT, listener);
  return () => window.removeEventListener(SEARCH_NAVIGATION_EVENT, listener);
}
