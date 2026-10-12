const VISITS_KEY = "char:install-visits:v1";
const DISMISSED_KEY = "char:install-dismissed:v1";
const DISMISS_DURATION = 30 * 24 * 60 * 60 * 1000;

export function recordInstallBannerVisit(): void {
  try {
    const storedVisits = Number(localStorage.getItem(VISITS_KEY));
    const visits = Number.isSafeInteger(storedVisits) && storedVisits >= 0 ? storedVisits + 1 : 1;
    localStorage.setItem(VISITS_KEY, String(visits));
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
    // Storage may be blocked; the permanent menu entry still offers installation.
  }
}

export function shouldOfferInstallBanner(): boolean {
  try {
    const visits = Number(localStorage.getItem(VISITS_KEY));
    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY));
    const isDismissed = Number.isFinite(dismissedAt) && dismissedAt > 0 && dismissedAt <= Date.now() && Date.now() - dismissedAt < DISMISS_DURATION;
    return Number.isSafeInteger(visits) && visits >= 2 && !isDismissed;
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
    return false;
  }
}

export function dismissInstallBanner(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
    // Closing still works for this mounted banner when persistence is unavailable.
  }
}
