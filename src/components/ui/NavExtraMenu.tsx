"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, LogIn, LogOut, Home } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import { cn } from "@/lib/utils";
import GoogleAuthDialog from "@/lib/components/auth/GoogleAuthDialog";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useTwoStepConfirm } from "@/hooks/useTwoStepConfirm";

type Props = {
  showHomeLinkInMenu?: boolean;
  className?: string;
};

export function NavExtraMenu({ showHomeLinkInMenu = false, className }: Props) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const reduceMotion = useReducedMotion();

  const buttonRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const desktopPanelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  const outsideRefs = useMemo(() => [buttonRef, mobilePanelRef, desktopPanelRef], []);
  useClickOutside(outsideRefs, () => close(), { enabled: open });
  useEscapeKey(() => close(), { enabled: open });

  const logoutConfirmMobile = useTwoStepConfirm<HTMLButtonElement>({
    onConfirm: () => signOut({ callbackUrl: "/" }),
  });

  const logoutConfirmDesktop = useTwoStepConfirm<HTMLButtonElement>({
    onConfirm: () => signOut({ callbackUrl: "/" }),
  });

  const menuItems = useMemo(() => {
    return {
      home: showHomeLinkInMenu,
      isAuthed: Boolean(session?.user),
    };
  }, [showHomeLinkInMenu, session?.user]);

  return (
    <>
      <GoogleAuthDialog open={authOpen} onOpenChange={setAuthOpen} />

      <div className={cn("relative", open && "z-[9002]", className)}>
        <button
          ref={buttonRef}
          aria-label="Меню"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={toggle}
          className={cn(
            "flex w-14 flex-col items-center justify-center gap-1 rounded-xl py-2 text-slate-400 transition-all hover:bg-white/5 hover:text-slate-200 md:w-16",
            open && "bg-white/5 text-slate-200"
          )}
        >
          <Menu className="h-6 w-6" />
          <span className="text-[11px] leading-none">Меню</span>
        </button>

        <AnimatePresence>
          {open ? (
            <>
              {/* Overlay: prevents click-through; closes on outside click */}
              <motion.div
                key="overlay"
                className="fixed inset-0 z-[9000] bg-black/65"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: reduceMotion ? 0 : 0.18 } }}
                exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.14 } }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  // Prevent click-through if the overlay unmounts between pointerdown and click.
                  const handler = (event: MouseEvent) => {
                    event.preventDefault();
                    event.stopPropagation();
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ;(event as any).stopImmediatePropagation?.();
                    document.removeEventListener("click", handler, true);
                  };

                  document.addEventListener("click", handler, true);
                  window.setTimeout(() => {
                    document.removeEventListener("click", handler, true);
                  }, 800);

                  close();
                }}
              />

              <motion.div
                key="mobile-sheet"
                ref={mobilePanelRef}
                role="menu"
                className={cn(
                  "fixed left-0 right-0 bottom-[calc(env(safe-area-inset-bottom)+72px)] z-[9001] mx-auto w-[min(540px,calc(100vw-24px))] md:hidden"
                )}
                initial={{ y: 18, scale: 0.98 }}
                animate={{ y: 0, scale: 1, transition: { duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] } }}
                exit={{ y: 14, scale: 0.98, transition: { duration: reduceMotion ? 0 : 0.18 } }}
              >
                <div className="glass-card relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl backdrop-saturate-150"
                  />

                  <div className="relative p-2">
                    <div className="mt-1 grid gap-1">
                      {menuItems.home ? (
                        <Link
                          href="/"
                          onClick={close}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
                        >
                          <Home className="h-4 w-4 text-slate-300" />
                          Головна
                        </Link>
                      ) : null}

                      <a
                        href="https://www.reddit.com/r/char_holota_family/"
                        target="_blank"
                        rel="noreferrer"
                        onClick={close}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
                      >
                        <Image src="/images/reddit.svg" alt="Reddit" width={16} height={16} className="opacity-100" />
                        Reddit
                      </a>

                      {menuItems.isAuthed ? (
                        <button
                          ref={logoutConfirmMobile.ref}
                          onClick={(e) => {
                            const wasConfirming = logoutConfirmMobile.isConfirming;
                            logoutConfirmMobile.onClick(e);
                            if (wasConfirming) close();
                          }}
                          className={cn(
                            "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                            logoutConfirmMobile.isConfirming
                              ? "bg-rose-600/25 text-rose-100 ring-1 ring-rose-500/50"
                              : "text-rose-200 hover:bg-rose-500/10"
                          )}
                        >
                          <LogOut className="h-4 w-4" />
                          {logoutConfirmMobile.isConfirming ? "Підтвердити вихід" : "Вийти"}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            close();
                            setAuthOpen(true);
                          }}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
                        >
                          <LogIn className="h-4 w-4 text-slate-300" />
                          Увійти
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Desktop popover (right of icon) */}
              <motion.div
                key="desktop-popover"
                ref={desktopPanelRef}
                role="menu"
                className={cn(
                  "absolute left-full ml-2 bottom-0 z-[9001] hidden w-64 md:block",
                  ""
                )}
                initial={{ x: -6, y: 6, scale: 0.98 }}
                animate={{ x: 0, y: 0, scale: 1, transition: { duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] } }}
                exit={{ x: -4, y: 4, scale: 0.98, transition: { duration: reduceMotion ? 0 : 0.14 } }}
              >
                <div className="glass-card relative w-64 overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl backdrop-saturate-150"
                  />

                  <div className="relative p-2">
                    <div className="mt-1 grid gap-1">
                      <a
                        href="https://www.reddit.com/r/char_holota_family/"
                        target="_blank"
                        rel="noreferrer"
                        onClick={close}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
                      >
                        <Image src="/images/reddit.svg" alt="Reddit" width={16} height={16} className="opacity-100" />
                        Reddit
                      </a>

                      {menuItems.isAuthed ? (
                        <button
                          ref={logoutConfirmDesktop.ref}
                          onClick={(e) => {
                            const wasConfirming = logoutConfirmDesktop.isConfirming;
                            logoutConfirmDesktop.onClick(e);
                            if (wasConfirming) close();
                          }}
                          className={cn(
                            "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                            logoutConfirmDesktop.isConfirming
                              ? "bg-rose-600/25 text-rose-100 ring-1 ring-rose-500/50"
                              : "text-rose-200 hover:bg-rose-500/10"
                          )}
                        >
                          <LogOut className="h-4 w-4" />
                          {logoutConfirmDesktop.isConfirming ? "Підтвердити вихід" : "Вийти"}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            close();
                            setAuthOpen(true);
                          }}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
                        >
                          <LogIn className="h-4 w-4 text-slate-300" />
                          Увійти
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}

