export function listSlidesToMount(
  activeIndex: number,
  slidesPerView: number,
  slideCount: number,
): { visible: number[]; neighbours: number[] } {
  const wrap = (index: number) => ((index % slideCount) + slideCount) % slideCount;
  const perView = Math.max(1, Math.min(Math.round(slidesPerView), slideCount));
  const visible = Array.from({ length: perView }, (_, offset) => wrap(activeIndex + offset));
  const neighbours = [wrap(activeIndex - 1), wrap(activeIndex + perView)].filter((index) => !visible.includes(index));
  return { visible, neighbours: [...new Set(neighbours)] };
}
