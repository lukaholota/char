import { CURRENT_RELEASE_FLAG, isWhatsNewSurface } from "./release-notes";
import { type FlagStorage, hasReturningVisitorSignal, isFlagSeen } from "./seen-flags";

export type WhatsNewDecision = {
  /// Сторінка не та — на іншій рішення прийматимемо заново.
  isOnSurface: boolean;
  shouldShow: boolean;
};

export function decideWhatsNew({
  pathname,
  isAuthenticated,
  storage,
}: {
  pathname: string;
  isAuthenticated: boolean;
  storage: FlagStorage | null;
}): WhatsNewDecision {
  if (!isWhatsNewSurface(pathname)) return { isOnSurface: false, shouldShow: false };
  if (isFlagSeen(storage, CURRENT_RELEASE_FLAG)) return { isOnSurface: true, shouldShow: false };

  const isReturningVisitor = isAuthenticated || hasReturningVisitorSignal(storage);
  return { isOnSurface: true, shouldShow: isReturningVisitor };
}
