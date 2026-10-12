export const APP_HISTORY_SCRIPT = `(() => {
  const key = '__charHistoryIndex';
  const history = window.history;
  const push = history.pushState.bind(history);
  const replace = history.replaceState.bind(history);
  const initialIndex = history.length > 1 && document.referrer && new URL(document.referrer).origin === location.origin ? 1 : 0;
  const index = () => Number.isSafeInteger(history.state?.[key]) ? history.state[key] : initialIndex;
  replace({ ...history.state, [key]: index() }, '');
  history.pushState = (state, title, url) => push({ ...state, [key]: index() + 1 }, title, url);
  history.replaceState = (state, title, url) => replace({ ...state, [key]: index() }, title, url);
})();`;

