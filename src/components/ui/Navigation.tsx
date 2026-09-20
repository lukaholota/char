"use client";

import { Logo } from "@/lib/components/icons/Logo";
import { DragonIcon } from "@/lib/components/icons/DragonIcon";
import { D20Icon } from "@/lib/components/icons/D20Icon";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { useSearchParams } from "next/navigation";
import { BookOpen, Eye, Home, Search, Sparkles, WandSparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import { useOmniSearchStore } from "@/lib/stores/omniSearchStore";
import { NavExtraMenu } from "@/components/ui/NavExtraMenu";
import { EditionSwitcher } from "@/components/ui/EditionSwitcher";
import { useRoutePathname } from "@/components/no-ai/NoAiModeProvider";
import { type Edition } from "@/rules/route-helpers";
import { type AccentSchemeName, findEditionAccent } from "@/styles/edition-accent";
import { useActiveEdition } from "@/components/ui/PersEditionPin";

const NAV_ACCENT = {
	arcane: {
		activeItem: "bg-arcane-400/10 text-arcane-200 ring-1 ring-inset ring-arcane-300/25",
		activeMarker: "bg-arcane-300",
		activeIcon: "drop-shadow-[0_0_6px_rgba(45,212,191,0.5)]",
		edgeLine: "via-arcane-400/30",
		ornament: "text-arcane-300/60",
		logoRing: "ring-arcane-400/20",
	},
	prism: {
		activeItem: "bg-prism-400/10 text-prism-200 ring-1 ring-inset ring-prism-300/25",
		activeMarker: "bg-prism-300",
		activeIcon: "drop-shadow-[0_0_6px_rgba(215,116,238,0.5)]",
		edgeLine: "via-prism-400/30",
		ornament: "text-prism-300/60",
		logoRing: "ring-prism-400/20",
	},
} satisfies Record<AccentSchemeName, Record<string, string>>;

// Kept in step with the button inside NavExtraMenu — "Меню" sits in the same row and must not
// drift away from its neighbours.
const ITEM = "relative flex w-16 flex-col items-center justify-center gap-1 rounded-xl py-2 transition-colors";
const ITEM_IDLE = "text-slate-400 hover:bg-white/5 hover:text-slate-200";
const ITEM_LABEL = "text-[11px] leading-none";

/// The phone shows one row of five; the desktop column has room for the whole catalogue set.
/// "Пошук" takes the slot "Предмети" used to hold on the phone (KR15.3 §1) and keeps its own
/// slot at the foot of the desktop column, so neither layout loses an entry. On the phone the
/// remaining catalogue slot goes to "Головна"; "Заклинання" stays reachable from "Меню".
type NavWidth = "both" | "desktop" | "mobile";

type NavItem = {
	key: string;
	label: string;
	icon: LucideIcon | "dragon";
	width: NavWidth;
	href?: string;
	onSelect?: () => void;
	matchesPathname?: (pathname: string) => boolean;
};

const NAV_WIDTH_CLASS: Record<NavWidth, string> = {
	both: "flex",
	desktop: "hidden md:flex",
	mobile: "flex md:hidden",
};

function buildNavItems(edition: Edition, openSearch: () => void): NavItem[] {
	const root = edition === "2024" ? "/2024" : "";
	const homeHref = root || "/";
	const startsWith = (prefix: string) => (pathname: string) => pathname.startsWith(prefix);

	return [
		{
			key: "home",
			href: homeHref,
			label: "Головна",
			icon: Home,
			width: "both",
			matchesPathname: (pathname) => pathname === homeHref,
		},
		{
			key: "spells",
			href: `${root}/spells`,
			label: "Заклинання",
			icon: Sparkles,
			width: "desktop",
			matchesPathname: startsWith(`${root}/spells`),
		},
		{
			key: "magic-items",
			href: `${root}/magic-items`,
			label: "Предмети",
			icon: WandSparkles,
			width: "desktop",
			matchesPathname: startsWith(`${root}/magic-items`),
		},
		{
			key: "search-mobile",
			label: "Пошук",
			icon: Search,
			width: "mobile",
			onSelect: openSearch,
		},
		{
			key: "characters",
			href: `${root}/char/home`,
			label: "Персонажі",
			icon: "dragon",
			width: "both",
			matchesPathname: (pathname) => pathname === `${root}/char` || pathname.startsWith(`${root}/char/`),
		},
		{
			key: "bestiary",
			href: `${root}/bestiary`,
			label: "Бестіарій",
			icon: Eye,
			width: "desktop",
			matchesPathname: startsWith(`${root}/bestiary`),
		},
		{
			key: "rules",
			href: `${root}/rules`,
			label: "Правила",
			icon: BookOpen,
			width: "desktop",
			matchesPathname: startsWith(`${root}/rules`),
		},
	];
}

function useIsInsideIframe() {
	const [isInsideIframe, setIsInsideIframe] = useState(false);

	useEffect(() => {
		if (typeof window !== "undefined" && window.self !== window.top) {
			setIsInsideIframe(true);
		}
	}, []);

	return isInsideIframe;
}

/// One weight for the whole bar. 1.5 rather than lucide's default 2, because the dragon is a
/// raster whose line cannot be raised that far without its own gaps closing — see DragonIcon.
const NAV_ICON_STROKE = 1.5;

function NavIcon({ icon, className }: { icon: LucideIcon | "dragon"; className?: string }) {
	if (icon === "dragon") {
		return <DragonIcon className={cn("h-6 w-6", className)} />;
	}

	const Icon = icon;
	return <Icon strokeWidth={NAV_ICON_STROKE} className={cn("h-6 w-6", className)} />;
}

function NavItemButton({
	item,
	isActive,
	accent,
}: {
	item: NavItem;
	isActive: boolean;
	accent: (typeof NAV_ACCENT)[AccentSchemeName];
}) {
	const body = (
		<>
			<NavIcon icon={item.icon} className={isActive ? accent.activeIcon : undefined} />
			<span className={ITEM_LABEL}>{item.label}</span>
			{isActive ? <ActiveMarker className={accent.activeMarker} /> : null}
		</>
	);
	const className = cn(
		ITEM,
		NAV_WIDTH_CLASS[item.width],
		isActive ? accent.activeItem : ITEM_IDLE,
	);

	if (item.href === undefined) {
		return (
			<button type="button" aria-label={item.label} onClick={item.onSelect} className={className}>
				{body}
			</button>
		);
	}

	return (
		<Link
			href={item.href}
			aria-label={item.label}
			aria-current={isActive ? "page" : undefined}
			className={className}
		>
			{body}
		</Link>
	);
}

function ActiveMarker({ className }: { className: string }) {
	return (
		<span
			aria-hidden
			className={cn(
				"absolute bottom-0.5 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full",
				"md:top-1/2 md:bottom-auto md:left-0 md:h-6 md:w-0.5 md:translate-x-0 md:-translate-y-1/2",
				className
			)}
		/>
	);
}

// Echoes the star divider that sits under every card title on the redesigned home screens.
function NavOrnament({ className }: { className: string }) {
	return (
		<span aria-hidden className="mt-2 hidden w-full items-center gap-2 px-5 md:flex">
			<span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/15" />
			<span className={cn("text-[8px] leading-none", className)}>✦</span>
			<span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/15" />
		</span>
	);
}

export const Navigation = () => {
	const pathname = useRoutePathname();
	const searchParams = useSearchParams();
	const isInsideIframe = useIsInsideIframe();
	const { toggle: toggleDice } = useDiceUIStore();
	const { open: openSearch } = useOmniSearchStore();
	const edition = useActiveEdition();

	const isEmbed =
		(pathname.startsWith("/spells") || pathname.startsWith("/magic-items") || pathname.startsWith("/2024/spells") || pathname.startsWith("/2024/magic-items")) &&
		searchParams.get("origin") === "character";

	if (isEmbed || isInsideIframe) {
		return null;
	}

	const accent = NAV_ACCENT[findEditionAccent(edition).scheme];
	const items = buildNavItems(edition, openSearch);
	const homeHref = edition === "2024" ? "/2024" : "/";

	// Панель меню всередині <nav> не може вибитися вище за сам <nav>: fixed + z-index робить із
	// нього контекст накладання. Тому рамка застосунку стоїть вище за плаваючі панелі сторінок
	// (крокова панель конструктора й левелапа — z-[60]), інакше вони ріжуть відкрите меню.
	return (
		<nav
			className={cn(
				"fixed bottom-0 left-0 z-[70] flex w-full flex-row items-center justify-between gap-1 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]",
				"border-t border-white/[0.07] bg-[#0b0b11] bg-[linear-gradient(to_top,#08080c,#0e0e16)]",
				"md:top-0 md:w-[88px] md:flex-col md:justify-between md:gap-0 md:border-t-0 md:border-r md:border-white/[0.07] md:px-0 md:py-6",
				"md:bg-[linear-gradient(to_bottom,#0e0e16,#08080c)]"
			)}
		>
			<span
				aria-hidden
				className={cn(
					"pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
					"md:inset-y-0 md:left-auto md:right-0 md:h-auto md:w-px md:bg-gradient-to-b",
					accent.edgeLine
				)}
			/>

			<div className="contents md:flex md:w-full md:flex-col md:items-center md:gap-2">
				<Link
					href={homeHref}
					aria-label="Головна"
					className={cn(
						"mb-3 hidden h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 transition hover:bg-white/[0.08] md:flex",
						accent.logoRing
					)}
				>
					<Logo className="h-7 w-7" />
				</Link>

				{items.map((item) => (
					<NavItemButton
						key={item.key}
						item={item}
						isActive={item.matchesPathname?.(pathname) ?? false}
						accent={accent}
					/>
				))}

				<NavOrnament className={accent.ornament} />
			</div>

			<div className="contents md:flex md:w-full md:flex-col md:items-center md:gap-2">
				<button
					type="button"
					aria-label="Пошук (Cmd+K)"
					onClick={openSearch}
					className={cn(ITEM, ITEM_IDLE, "hidden md:flex")}
				>
					<NavIcon icon={Search} />
					<span className={ITEM_LABEL}>Пошук</span>
				</button>

				<EditionSwitcher className="hidden md:flex" />

				<button
					type="button"
					aria-label="Кубики"
					onClick={toggleDice}
					className={cn(ITEM, "flex text-amber-400/80 hover:bg-amber-500/10 hover:text-amber-400")}
				>
					<D20Icon strokeWidth={NAV_ICON_STROKE} />
					<span className={ITEM_LABEL}>Кубики</span>
				</button>

				<NavExtraMenu showHomeLinkInMenu={true} />
			</div>
		</nav>
	);
};
