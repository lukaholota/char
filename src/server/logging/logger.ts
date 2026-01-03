import crypto from "node:crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

function serializeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      ...(value as any).cause ? { cause: serializeValue((value as any).cause) } : {},
    };
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = serializeValue(v);
    }
    return out;
  }

  return value;
}

function emit(level: LogLevel, payload: unknown) {
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else if (level === "debug") console.debug(line);
  else console.log(line);
}

export function hashPII(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 12);
}

export interface Logger {
  debug: (event: string, fields?: LogFields) => void;
  info: (event: string, fields?: LogFields) => void;
  warn: (event: string, fields?: LogFields) => void;
  error: (event: string, fields?: LogFields) => void;
  child: (extraBaseFields: LogFields) => Logger;
}

export function createLogger(scope: string, baseFields: LogFields = {}): Logger {
  const write = (level: LogLevel, event: string, fields?: LogFields) => {
    const payload = serializeValue({
      ts: new Date().toISOString(),
      level,
      scope,
      event,
      ...baseFields,
      ...(fields ?? {}),
    });
    emit(level, payload);
  };

  return {
    debug: (event, fields) => write("debug", event, fields),
    info: (event, fields) => write("info", event, fields),
    warn: (event, fields) => write("warn", event, fields),
    error: (event, fields) => write("error", event, fields),
    child: (extraBaseFields) => createLogger(scope, { ...baseFields, ...extraBaseFields }),
  };
}
