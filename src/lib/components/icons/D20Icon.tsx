import { cn } from "@/lib/utils";

export function D20Icon({ className, strokeWidth = 1.6 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("h-6 w-6 shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d="M12 2l8.66 5v10L12 22l-8.66-5V7z" />
      <path d="M12 6.5L6.6 15.5h10.8z" />
      <path d="M12 6.5V2M12 6.5L3.34 7M12 6.5l8.66 0M6.6 15.5L3.34 17M6.6 15.5L12 22M17.4 15.5l3.26 1.5M17.4 15.5L12 22" />
    </svg>
  );
}
