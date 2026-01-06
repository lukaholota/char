"use client";

import { Logo } from "@/lib/components/icons/Logo";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, Sparkles, Dices, WandSparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import { NavExtraMenu } from "@/components/ui/NavExtraMenu";

export const Navigation = () => {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { toggle } = useDiceUIStore();

	const isEmbed =
		(pathname.startsWith("/spells") || pathname.startsWith("/magic-items")) &&
		searchParams.get("origin") === "character";

	const [isIframe, setIsIframe] = useState(false);
	useEffect(() => {
		if (typeof window !== "undefined" && window.self !== window.top) {
			setIsIframe(true);
		}
	}, []);

	if (isEmbed || isIframe) {
		return null;
	}

	const navLinks = [
		{ href: "/", icon: Home, label: "Головна", desktopOnly: true },
		{ href: "/spells", icon: Sparkles, label: "Заклинання" },
		{ href: "/magic-items", icon: WandSparkles, label: "Предмети" },
		{ href: "/char/home", icon: "dragon", label: "Персонажі" },
	];

	return (
		<nav className="fixed bottom-0 left-0 z-50 flex w-full flex-row items-center justify-around gap-1 border-t border-white/5 bg-slate-950/40 px-3 py-2.5 backdrop-blur-xl md:sticky md:top-0 md:h-screen md:w-20 md:flex-col md:justify-between md:border-t-0 md:border-r md:py-8">
			{/* Top Section: Logo & Main Links */}
			<div className="flex flex-row items-center gap-4 md:flex-col md:gap-8">
				<Link
					href="/"
					aria-label="Головна"
					className="hidden h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 to-violet-500/20 shadow-lg ring-1 ring-white/10 transition-transform hover:scale-105 active:scale-95 md:flex md:h-12 md:w-12"
				>
					<Logo className="h-7 w-7 md:h-8 md:w-8" />
				</Link>

				<div className="flex flex-row gap-1 md:flex-col md:gap-4">
					{navLinks.map((link) => {
						const isActive =
							link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

						return (
							<Link
								key={link.href}
								href={link.href}
								aria-label={link.label}
								className={cn(
										"relative flex w-14 flex-col items-center justify-center gap-1 rounded-xl py-2 transition-all duration-300 md:w-16",
									link.desktopOnly ? "hidden md:flex" : "flex",
									isActive
										? "bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/30 shadow-[inset_0_0_10px_rgba(45,212,191,0.2)]"
										: "text-slate-400 hover:bg-white/5 hover:text-slate-200"
								)}
							>
								{link.icon === "dragon" ? (
									<Image
										src="/images/dragon.png"
										alt=""
										width={24}
										height={24}
										className={cn(
											"h-6 w-6",
											isActive && "drop-shadow-[0_0_5px_rgba(45,212,191,0.5)]"
										)}
										priority={false}
									/>
								) : (
									(() => {
										const Icon = link.icon;
										return (
											<Icon
												className={cn(
													"h-6 w-6",
													isActive && "drop-shadow-[0_0_5px_rgba(45,212,191,0.5)]"
												)}
											/>
										);
									})()
								)}
								<span className="text-[11px] leading-none">{link.label}</span>
							</Link>
						);
					})}
				</div>
			</div>

			{/* Bottom Section: Dice & Extra menu */}
			<div className="flex flex-row gap-0 md:flex-col md:gap-4">
				{/* Dice Roller */}
				<button
					aria-label="Кубики"
					onClick={toggle}
					className="flex w-14 flex-col items-center justify-center gap-1 rounded-xl py-2 text-amber-400/80 transition-all hover:bg-amber-500/10 hover:text-amber-400 md:w-16"
				>
					<Dices className="h-6 w-6" />
					<span className="text-[11px] leading-none">Кубики</span>
				</button>

				<NavExtraMenu showHomeLinkInMenu={true} />
			</div>
		</nav>
	);
};
