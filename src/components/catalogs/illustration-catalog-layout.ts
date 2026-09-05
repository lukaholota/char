/// Каталоги, де ілюстрація — головне (раси, класи), віддають списку половину ширини замість
/// звичних 5/12: на col-span-5 картка 16:9 виходить надто низькою, щоб арт читався як акцент.
export const ILLUSTRATION_LIST_CLASSNAME =
  "lg:col-span-6 xl:col-span-6 flex flex-col h-full overflow-hidden rounded-xl lg:rounded-2xl border-0 lg:border border-white/10 bg-transparent lg:bg-slate-950/40 lg:backdrop-blur-xl";

export const ILLUSTRATION_DETAIL_CLASSNAME =
  "hidden lg:block lg:col-span-6 xl:col-span-6 h-full overflow-y-auto pr-1";
