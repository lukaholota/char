"use client";

import { Logo } from "@/lib/components/icons/Logo";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { useSearchParams } from "next/navigation";
import { Home, Sparkles, Dices, WandSparkles, Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import { useOmniSearchStore } from "@/lib/stores/omniSearchStore";
import { NavExtraMenu } from "@/components/ui/NavExtraMenu";
import { EditionSwitcher } from "@/components/ui/EditionSwitcher";
import { useRoutePathname } from "@/components/no-ai/NoAiModeProvider";
import { getEditionFromPathname, type Edition } from "@/rules/route-helpers";

const EDITION_ACCENT = {
	"2014": {
		activeItem: "bg-teal-400/10 text-teal-200 ring-1 ring-inset ring-teal-300/25",
		activeMarker: "bg-teal-300",
		activeIcon: "drop-shadow-[0_0_6px_rgba(45,212,191,0.5)]",
		edgeLine: "via-teal-400/30",
		ornament: "text-teal-300/60",
		logoRing: "ring-teal-400/20",
	},
	"2024": {
		activeItem: "bg-amber-400/10 text-amber-200 ring-1 ring-inset ring-amber-300/25",
		activeMarker: "bg-amber-300",
		activeIcon: "drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]",
		edgeLine: "via-amber-400/30",
		ornament: "text-amber-300/60",
		logoRing: "ring-amber-400/20",
	},
} satisfies Record<Edition, Record<string, string>>;

// Kept in step with the button inside NavExtraMenu — "Меню" sits in the same row and must not
// drift away from its neighbours.
const ITEM = "relative flex w-16 flex-col items-center justify-center gap-1 rounded-xl py-2 transition-colors";
const ITEM_IDLE = "text-slate-400 hover:bg-white/5 hover:text-slate-200";
const ITEM_LABEL = "text-[11px] leading-none";

type NavLink = {
	href: string;
	label: string;
	icon: LucideIcon | "dragon";
	desktopOnly?: boolean;
	matchesPathname: (pathname: string) => boolean;
};

function buildNavLinks(edition: Edition): NavLink[] {
	const root = edition === "2024" ? "/2024" : "";
	const homeHref = root || "/";

	return [
		{
			href: homeHref,
			label: "Головна",
			icon: Home,
			desktopOnly: true,
			matchesPathname: (pathname) => pathname === homeHref,
		},
		{
			href: `${root}/spells`,
			label: "Заклинання",
			icon: Sparkles,
			matchesPathname: (pathname) => pathname.startsWith(`${root}/spells`),
		},
		{
			href: `${root}/magic-items`,
			label: "Предмети",
			icon: WandSparkles,
			matchesPathname: (pathname) => pathname.startsWith(`${root}/magic-items`),
		},
		{
			href: `${root}/char/home`,
			label: "Персонажі",
			icon: "dragon",
			matchesPathname: (pathname) => pathname === `${root}/char` || pathname.startsWith(`${root}/char/`),
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

function NavIcon({ icon, className }: { icon: LucideIcon | "dragon"; className?: string }) {
	if (icon === "dragon") {
		return <Image src="/images/dragon.png" alt="" width={24} height={24} className={cn("h-6 w-6", className)} priority={false} />;
	}

	const Icon = icon;
	return <Icon className={cn("h-6 w-6", className)} />;
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

	const isEmbed =
		(pathname.startsWith("/spells") || pathname.startsWith("/magic-items") || pathname.startsWith("/2024/spells") || pathname.startsWith("/2024/magic-items")) &&
		searchParams.get("origin") === "character";

	if (isEmbed || isInsideIframe) {
		return null;
	}

	const edition = getEditionFromPathname(pathname);
	const accent = EDITION_ACCENT[edition];
	const links = buildNavLinks(edition);
	const homeHref = links[0].href;

	return (
		<nav
			className={cn(
				"fixed bottom-0 left-0 z-50 flex w-full flex-row items-center justify-between gap-1 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]",
				"border-t border-white/[0.07] bg-[#0b0b11] bg-[linear-gradient(to_top,#08080c,#0e0e16)]",
				"md:sticky md:top-0 md:h-screen md:flex-col md:justify-between md:gap-0 md:border-t-0 md:border-r md:border-white/[0.07] md:px-0 md:py-6",
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

				{links.map((link) => {
					const isActive = link.matchesPathname(pathname);

					return (
						<Link
							key={link.href}
							href={link.href}
							aria-label={link.label}
							aria-current={isActive ? "page" : undefined}
							className={cn(ITEM, link.desktopOnly ? "hidden md:flex" : "flex", isActive ? accent.activeItem : ITEM_IDLE)}
						>
							<NavIcon icon={link.icon} className={isActive ? accent.activeIcon : undefined} />
							<span className={ITEM_LABEL}>{link.label}</span>
							{isActive ? <ActiveMarker className={accent.activeMarker} /> : null}
						</Link>
					);
				})}

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
					<NavIcon icon={Dices} />
					<span className={ITEM_LABEL}>Кубики</span>
				</button>

				<NavExtraMenu showHomeLinkInMenu={true} />
			</div>
		</nav>
	);
};
