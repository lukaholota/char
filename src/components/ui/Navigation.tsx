import { Logo } from "@/components/icons/Logo";

export const Navigation = () => {
  return (
    <nav className="flex fixed inset-x-0 bottom-0 md:inset-y-0 md:left-0 flex-row md:flex-col order-last md:order-first bg-slate-800 w-full md:w-16 md:h-full px-2">
      <div className="flex flex-row md:flex-col  justify-evenly  md:justify-between h-full w-full py-1">
        <div className="flex flex-row md:flex-col gap-10 md:gap-4 h-full w-full justify-evenly md:justify-normal ">
          <a href="/spells" className="flex items-center justify-center h-12 w-12 md:mt-2">
            <Logo/>
          </a>

          <div className="">1</div>
          <div className="">1</div>

          <div className=" md:hidden">2</div>
        </div>

        <div>
          <div className="hidden md:block">2</div>
        </div>
      </div>
    </nav>
  )
}