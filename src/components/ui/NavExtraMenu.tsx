"use client";

import Image from "next/image";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { useCallback, useMemo, useRef, useState, RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Menu, LogIn, LogOut, Home, Heart, Search, Sparkles, MessageSquareWarning } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { forgetOfflinePages } from "@/lib/offline/service-worker";
import { flushOfflineQueue } from "@/lib/offline/queue";

import { cn } from "@/lib/utils";
import GoogleAuthDialog from "@/lib/components/auth/GoogleAuthDialog";
import { ReportProblemDialog } from "@/lib/components/problemReport/ReportProblemDialog";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useTwoStepConfirm } from "@/hooks/useTwoStepConfirm";
import { EditionSwitcher } from "@/components/ui/EditionSwitcher";
import { NoAiSwitcher } from "@/components/no-ai/NoAiSwitcher";
import { findEditionAccent } from "@/styles/edition-accent";
import { useRoutePathname } from "@/components/no-ai/NoAiModeProvider";
import { useActiveEdition } from "@/components/ui/PersEditionPin";
import { useOmniSearchStore } from "@/lib/stores/omniSearchStore";
import { MENU_PANEL } from "@/components/ui/menu-panel";
import { collectMenuCatalogs, findCatalogHref, findCatalogTitle, type CatalogEntry } from "@/lib/catalogs/catalog-registry";
import type { Edition } from "@/rules/route-helpers";

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
  onOpenReport: () => void;
  logoutConfirm: {
    ref: RefObject<HTMLButtonElement | null>;
    isConfirming: boolean;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  };
};

const MENU_ITEM =
  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5";

type CatalogLink = {
  href: string;
  icon: LucideIcon;
  label: string;
  iconClass?: string;
  mobileOnly?: boolean;
};

function buildCatalogLinks(is2024: boolean, showHome: boolean): CatalogLink[] {
  const edition: Edition = is2024 ? "2024" : "2014";
  const accent = findEditionAccent(is2024 ? "2024" : "2014").solid.text;
  const home: CatalogLink[] = showHome
    ? [{ href: is2024 ? "/2024" : "/", icon: Home, label: "Головна", iconClass: "text-slate-300" }]
    : [];

  const catalogs = collectMenuCatalogs(edition).flatMap((entry) => {
    const href = findCatalogHref(entry.slug, edition);
    return href ? [{ href, icon: entry.menuIcon, label: buildMenuLabel(entry, edition), iconClass: accent }] : [];
  });

  const spellsHref = findCatalogHref("spells", edition);
  const mobileSpells: CatalogLink[] = spellsHref
    ? [{ href: spellsHref, icon: Sparkles, label: findCatalogTitle("spells", edition), iconClass: accent, mobileOnly: true }]
    : [];

  return [...home, ...mobileSpells, ...catalogs];
}

/// Каталог, що є в обох редакціях під тією самою назвою, у 2024 несе рік — «Класи 2024»;
/// перейменований («Види») чи однієї редакції («Вливання Винахідника») — ні.
function buildMenuLabel(entry: CatalogEntry, edition: Edition): string {
  const title = findCatalogTitle(entry.slug, edition);
  const sharesTitleAcrossEditions = entry.editions.length === 2 && !entry.title2024;
  return edition === "2024" && sharesTitleAcrossEditions ? `${title} 2024` : title;
}

function NavMenuItems({
  is2024,
  showHome,
  isAuthed,
  close,
  onOpenAuth,
  onOpenReport,
  logoutConfirm,
}: MenuItemsProps) {
  const { open: openSearch } = useOmniSearchStore();
  const accent = findEditionAccent(is2024 ? "2024" : "2014").solid.text;

  return (
    <div className="mt-1 grid gap-1">
      <button
        type="button"
        onClick={() => {
          close();
          openSearch();
        }}
        className={cn(MENU_ITEM, "w-full text-left")}
      >
        <Search className={cn("h-4 w-4", accent)} />
        <span>Швидкий пошук</span>
        <kbd className="ml-auto text-[10px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">⌘K</kbd>
      </button>

      {buildCatalogLinks(is2024, showHome).map(({ href, icon: Icon, label, iconClass, mobileOnly }) => (
        <Link key={href} href={href} onClick={close} className={cn(MENU_ITEM, mobileOnly && "md:hidden")}>
          <Icon className={cn("h-4 w-4", iconClass)} />
          {label}
        </Link>
      ))}

      <button
        type="button"
        onClick={() => {
          close();
          onOpenReport();
        }}
        className={cn(MENU_ITEM, "w-full text-left")}
      >
        <MessageSquareWarning className="h-4 w-4 text-amber-400" />
        Повідомити про проблему
      </button>

      <a
        href="https://www.reddit.com/r/char_holota_family/"
        target="_blank"
        rel="noreferrer"
        onClick={close}
        className={MENU_ITEM}
      >
        <Image src="/images/reddit.svg" alt="Reddit" width={16} height={16} className="opacity-100" />
        Reddit
      </a>

      <a
        href="https://send.monobank.ua/jar/8HZeSFfqwf"
        target="_blank"
        rel="noreferrer"
        onClick={close}
        className={MENU_ITEM}
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
          className={MENU_ITEM}
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
  const edition = useActiveEdition();
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

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
    onConfirm: async () => {
      await flushOfflineQueue().catch(() => undefined);
      await forgetOfflinePages();
      await signOut({ callbackUrl: "/" });
    },
  });

  const logoutConfirmDesktop = useTwoStepConfirm<HTMLButtonElement>({
    onConfirm: async () => {
      await flushOfflineQueue().catch(() => undefined);
      await forgetOfflinePages();
      await signOut({ callbackUrl: "/" });
    },
  });

  const is2024 = edition === "2024";

  return (
    <>
      <GoogleAuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <ReportProblemDialog open={reportOpen} onOpenChange={setReportOpen} pathname={pathname} />

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
                className="fixed inset-0 z-[9000] bg-black/45 backdrop-blur-[2px]"
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
                <div className={MENU_PANEL}>
                  <div className="relative p-2">
                    <MenuOptionsRow showEdition close={close} />
                    <NavMenuItems
                      is2024={is2024}
                      showHome={showHomeLinkInMenu}
                      isAuthed={Boolean(session?.user)}
                      close={close}
                      onOpenAuth={() => setAuthOpen(true)}
                      onOpenReport={() => setReportOpen(true)}
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
                <div className={cn(MENU_PANEL, "w-64")}>
                  <div className="relative p-2">
                    <MenuOptionsRow showEdition={false} close={close} />
                    <NavMenuItems
                      is2024={is2024}
                      showHome={showHomeLinkInMenu}
                      isAuthed={Boolean(session?.user)}
                      close={close}
                      onOpenAuth={() => setAuthOpen(true)}
                      onOpenReport={() => setReportOpen(true)}
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
