/// KR15.3 §3 — «розмите, прозоро-темне». Було два шари, `.glass-card` на 60 % плюс аркуш на 80 %,
/// разом ~92 % непрозорості: блюру позаду не лишалося чого показувати. Один прозорий шар, справжнє
/// розмиття і волосяний світлий кант. Спільне для меню навігації та висувних полотен.
export const MENU_PANEL =
  "relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55 shadow-2xl " +
  "backdrop-blur-2xl backdrop-saturate-150 " +
  "shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9),inset_1px_1px_0_rgba(255,255,255,0.09)]";
