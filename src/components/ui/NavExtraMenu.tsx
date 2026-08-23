"use client";

import Image from "next/image";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { useCallback, useMemo, useRef, useState, RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, LogIn, LogOut, Home, Heart, Award, Eye, Sword, Shield, Wrench, Sparkles, BookOpen, Search, ScrollText } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import { cn } from "@/lib/utils";
import GoogleAuthDialog from "@/lib/components/auth/GoogleAuthDialog";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useTwoStepConfirm } from "@/hooks/useTwoStepConfirm";
import { EditionSwitcher } from "@/components/ui/EditionSwitcher";
import { NoAiSwitcher } from "@/components/no-ai/NoAiSwitcher";
import { useRoutePathname } from "@/components/no-ai/NoAiModeProvider";
import { getEditionFromPathname } from "@/rules/route-helpers";
import { useOmniSearchStore } from "@/lib/stores/omniSearchStore";

type Props = {
  showHomeLinkInMenu?: boolean;
  className?: string;
};

type MenuItemsProps = {
  is2024: boolean;
  showHome: boolean;
  isAuthed: boolean;
  close: () => void;
  onOpenAuth: () => void;
  logoutConfirm: {
    ref: RefObject<HTMLButtonElement | null>;
    isConfirming: boolean;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  };
};

function NavMenuItems({
  is2024,
  showHome,
  isAuthed,
  close,
  onOpenAuth,
  logoutConfirm,
}: MenuItemsProps) {
  const { open: openSearch } = useOmniSearchStore();
  const homeHref = is2024 ? "/2024" : "/";
  const rulesHref = is2024 ? "/2024/rules" : "/rules";
  const featsHref = is2024 ? "/2024/feats" : "/feats";
  const bestiaryHref = is2024 ? "/2024/bestiary" : "/bestiary";
  const weaponsHref = is2024 ? "/2024/weapons" : "/weapons";
  const armorHref = is2024 ? "/2024/armor" : "/armor";
  const infusionsHref = "/infusions";
  const invocationsHref = is2024 ? "/2024/invocations" : "/invocations";
  const backgroundsHref = is2024 ? "/2024/backgrounds" : "/backgrounds";

  return (
    <div className="mt-1 grid gap-1">
      <button
        type="button"
        onClick={() => {
          close();
          openSearch();
        }}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5 w-full text-left"
      >
        <Search className={cn("h-4 w-4", is2024 ? "text-amber-400" : "text-teal-400")} />
        <span>Швидкий пошук</span>
        <kbd className="ml-auto text-[10px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">⌘K</kbd>
      </button>

      {showHome ? (
        <Link
          href={homeHref}
          onClick={close}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
        >
          <Home className="h-4 w-4 text-slate-300" />
          Головна
        </Link>
      ) : null}

      <Link
        href={rulesHref}
        onClick={close}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
      >
        <BookOpen className={cn("h-4 w-4", is2024 ? "text-amber-400" : "text-teal-400")} />
        Довідник правил {is2024 ? "2024" : ""}
      </Link>

      <Link
        href={weaponsHref}
        onClick={close}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
      >
        <Sword className={cn("h-4 w-4", is2024 ? "text-amber-400" : "text-teal-400")} />
        Зброя {is2024 ? "2024" : ""}
      </Link>

      <Link
        href={armorHref}
        onClick={close}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
      >
        <Shield className={cn("h-4 w-4", is2024 ? "text-amber-400" : "text-teal-400")} />
        Обладунки {is2024 ? "2024" : ""}
      </Link>

      <Link
        href={featsHref}
        onClick={close}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
      >
        <Award className={cn("h-4 w-4", is2024 ? "text-amber-400" : "text-teal-400")} />
        Риси {is2024 ? "2024" : ""}
      </Link>

      <Link
        href={invocationsHref}
        onClick={close}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
      >
        <Sparkles className={cn("h-4 w-4", is2024 ? "text-amber-400" : "text-teal-400")} />
        Потойбічні виклики {is2024 ? "2024" : ""}
      </Link>

      {!is2024 && (
        <Link
          href={infusionsHref}
          onClick={close}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
        >
          <Wrench className="h-4 w-4 text-teal-400" />
          Вливання Винахідника
        </Link>
      )}

      <Link
        href={backgroundsHref}
        onClick={close}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
      >
        <ScrollText className={cn("h-4 w-4", is2024 ? "text-amber-400" : "text-teal-400")} />
        Походження {is2024 ? "2024" : ""}
      </Link>

      <Link
        href={bestiaryHref}
        onClick={close}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
      >
        <Eye className={cn("h-4 w-4", is2024 ? "text-amber-400" : "text-teal-400")} />
        Бестіарій {is2024 ? "2024" : ""}
      </Link>

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

      <a
        href="https://send.monobank.ua/jar/8HZeSFfqwf"
        target="_blank"
        rel="noreferrer"
        onClick={close}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
      >
        <Heart className="h-4 w-4 text-rose-400" />
        На розвиток сайту :)
      </a>

      {isAuthed ? (
        <button
          ref={logoutConfirm.ref}
          onClick={(e) => {
            const wasConfirming = logoutConfirm.isConfirming;
            logoutConfirm.onClick(e);
            if (wasConfirming) close();
          }}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
            logoutConfirm.isConfirming
              ? "bg-rose-600/25 text-rose-100 ring-1 ring-rose-500/50"
              : "text-rose-200 hover:bg-rose-500/10"
          )}
        >
          <LogOut className="h-4 w-4" />
          {logoutConfirm.isConfirming ? "Підтвердити вихід" : "Вийти"}
        </button>
      ) : (
        <button
          onClick={() => {
            close();
            onOpenAuth();
          }}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
        >
          <LogIn className="h-4 w-4 text-slate-300" />
          Увійти
        </button>
      )}
    </div>
  );
}

function MenuOptionsRow({ showEdition, close }: { showEdition: boolean; close: () => void }) {
  return (
    <div className="mb-2 flex items-center justify-center gap-2 border-b border-white/10 pb-2">
      {showEdition ? <EditionSwitcher /> : null}
      <NoAiSwitcher onSwitched={close} />
    </div>
  );
}

export function NavExtraMenu({ showHomeLinkInMenu = false, className }: Props) {
  const pathname = useRoutePathname();
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

  const edition = getEditionFromPathname(pathname);
  const is2024 = edition === "2024";

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
            "flex w-16 flex-col items-center justify-center gap-1 rounded-xl py-2 text-slate-400 transition-all hover:bg-white/5 hover:text-slate-200 md:w-16",
            open && "bg-white/5 text-slate-200"
          )}
        >
          <Menu className="h-6 w-6" />
          <span className="text-[11px] leading-none">Меню</span>
        </button>

        <AnimatePresence>
          {open ? (
            <>
              {/* Overlay */}
              <motion.div
                key="overlay"
                className="fixed inset-0 z-[9000] bg-black/65"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: reduceMotion ? 0 : 0.18 } }}
                exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.14 } }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

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

              {/* Mobile sheet */}
              <motion.div
                key="mobile-sheet"
                ref={mobilePanelRef}
                role="menu"
                className={cn(
                  "fixed left-0 right-0 bottom-[calc(env(safe-area-inset-bottom)+72px)] z-[9001] mx-auto w-[min(540px,calc(100vw-24px))] md:hidden max-h-[80dvh] overflow-y-auto"
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
                    <MenuOptionsRow showEdition close={close} />
                    <NavMenuItems
                      is2024={is2024}
                      showHome={showHomeLinkInMenu}
                      isAuthed={Boolean(session?.user)}
                      close={close}
                      onOpenAuth={() => setAuthOpen(true)}
                      logoutConfirm={logoutConfirmMobile}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Desktop popover */}
              <motion.div
                key="desktop-popover"
                ref={desktopPanelRef}
                role="menu"
                className="absolute left-full ml-2 bottom-0 z-[9001] hidden w-64 md:block max-h-[85dvh] overflow-y-auto"
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
                    <MenuOptionsRow showEdition={false} close={close} />
                    <NavMenuItems
                      is2024={is2024}
                      showHome={showHomeLinkInMenu}
                      isAuthed={Boolean(session?.user)}
                      close={close}
                      onOpenAuth={() => setAuthOpen(true)}
                      logoutConfirm={logoutConfirmDesktop}
                    />
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
