import { describe, expect, it } from "vitest";
import { buildCatalogEmbedParams, findCatalogEmbed } from "@/lib/catalog-url-helpers";

const embedOf = (query: string) => findCatalogEmbed(new URLSearchParams(query));

describe("режим вбудовування каталогу", () => {
  it("звичайна адреса каталогу режиму не вмикає", () => {
    expect(embedOf("")).toBeNull();
    expect(embedOf("lvl=5&order=CRAFT&q=кузня")).toBeNull();
  });

  it("сам по собі persId нічого не значить, як і origin без нього", () => {
    expect(embedOf("persId=7")).toBeNull();
    expect(embedOf("origin=character")).toBeNull();
    expect(embedOf("origin=catalog&persId=7")).toBeNull();
  });

  it("несправжній persId відкидається, а не читається як нуль", () => {
    expect(embedOf("origin=character&persId=abc")).toBeNull();
    expect(embedOf("origin=character&persId=0")).toBeNull();
    expect(embedOf("origin=character&persId=-3")).toBeNull();
    expect(embedOf("origin=character&persId=7.5")).toBeNull();
  });

  it("повний набір вмикає режим і несе імʼя персонажа", () => {
    expect(embedOf("origin=character&persId=7")).toEqual({ persId: 7, persName: null });
    expect(embedOf("origin=character&persId=7&persName=Ельга")).toEqual({
      persId: 7,
      persName: "Ельга",
    });
  });

  it("побудований запит читається назад тим самим розбором", () => {
    const params = buildCatalogEmbedParams({ persId: 42, persName: "Мирон" });

    expect(findCatalogEmbed(new URLSearchParams(params))).toEqual({
      persId: 42,
      persName: "Мирон",
    });
  });
});
