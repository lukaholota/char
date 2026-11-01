import { describe, expect, it } from "vitest";
import { createSseParser, type SseMessage } from "./sse-parser";

function collect(chunks: string[]): SseMessage[] {
  const messages: SseMessage[] = [];
  const push = createSseParser((message) => messages.push(message));
  chunks.forEach(push);
  return messages;
}

describe("createSseParser", () => {
  it("joins a message split across chunks", () => {
    expect(collect(["id: 7\nevent: ro", "ll\ndata: {\"seq\":7}", "\n\n"])).toEqual([{ event: "roll", data: '{"seq":7}', id: "7" }]);
  });

  it("skips heartbeats and keeps an unfinished tail", () => {
    expect(collect([": ping\n\nevent: ready\ndata: {}\n\nevent: roll\ndata: {"])).toEqual([{ event: "ready", data: "{}", id: null }]);
  });

  it("accepts CRLF and multi-line data", () => {
    expect(collect(["data: a\r\ndata: b\r\n\r\n"])).toEqual([{ event: "message", data: "a\nb", id: null }]);
  });
});
