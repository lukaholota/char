export type SseMessage = { event: string; data: string; id: string | null };

/// Потік приходить шматками довільної довжини: парсер тримає хвіст і віддає лише завершені повідомлення.
export function createSseParser(onMessage: (message: SseMessage) => void) {
  let buffer = "";
  return (chunk: string) => {
    buffer += chunk;
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const message = parseBlock(block);
      if (message) onMessage(message);
    }
  };
}

function parseBlock(block: string): SseMessage | null {
  let event = "message";
  let id: string | null = null;
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
    if (field === "event") event = value;
    else if (field === "data") data.push(value);
    else if (field === "id") id = value;
  }
  return data.length ? { event, data: data.join("\n"), id } : null;
}
