import { describe, expect, it } from "vitest";
import { listSlidesToMount } from "@/lib/components/characterSheet/carousel-slide-window";

describe("лист монтує лише видимі слайди й сусідні", () => {
  it("телефон: один видимий, сусіди з обох боків через петлю", () => {
    expect(listSlidesToMount(0, 1, 5)).toEqual({ visible: [0], neighbours: [4, 1] });
  });

  it("планшет: два видимих", () => {
    expect(listSlidesToMount(3, 2, 5)).toEqual({ visible: [3, 4], neighbours: [2, 0] });
  });

  it("десктоп з «Фіч»: три видимих, петля загортає", () => {
    expect(listSlidesToMount(4, 3, 5)).toEqual({ visible: [4, 0, 1], neighbours: [3, 2] });
  });

  it("слайдів менше, ніж місць, — сусідів немає", () => {
    expect(listSlidesToMount(0, 3, 3)).toEqual({ visible: [0, 1, 2], neighbours: [] });
  });
});
