import { Logo } from "@/components/icons/Logo";

export const Navigation = () => {
  return (
    <nav className="row-start-2 md:row-start-1 md:col-start-1 flex w-full flex-row items-center justify-center gap-4 border-t border-slate-800/70 bg-slate-900/70 px-3 py-2 shadow-lg md:h-screen md:flex-col md:justify-between md:border-t-0 md:border-r md:px-2 md:py-4 md:sticky md:top-0">
      <div className="flex flex-row items-center gap-3 md:flex-col md:gap-4">
        <a href="/spells" className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/80 shadow-inner md:mt-2">
          <Logo/>
        </a>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/60 text-slate-400">1</div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/60 text-slate-400">2</div>
      </div>
      <div className="hidden md:flex flex-col gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/60 text-slate-400">⚙️</div>
      </div>
    </nav>
  )
}
