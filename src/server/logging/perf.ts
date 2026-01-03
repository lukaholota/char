export type MemorySnapshot = {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
};

export type CpuSnapshot = {
  userMicros: number;
  systemMicros: number;
};

export type UsageSnapshot = {
  hrtimeNs: bigint;
  mem: MemorySnapshot;
  cpu: CpuSnapshot;
};

export function takeUsageSnapshot(): UsageSnapshot {
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();

  return {
    hrtimeNs: process.hrtime.bigint(),
    mem: {
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers,
    },
    cpu: {
      userMicros: cpu.user,
      systemMicros: cpu.system,
    },
  };
}

export function diffUsage(start: UsageSnapshot, end: UsageSnapshot) {
  const durationMs = Number(end.hrtimeNs - start.hrtimeNs) / 1e6;
  const cpuUserMs = (end.cpu.userMicros - start.cpu.userMicros) / 1000;
  const cpuSystemMs = (end.cpu.systemMicros - start.cpu.systemMicros) / 1000;

  return {
    durationMs,
    cpuUserMs,
    cpuSystemMs,
    memDelta: {
      rss: end.mem.rss - start.mem.rss,
      heapTotal: end.mem.heapTotal - start.mem.heapTotal,
      heapUsed: end.mem.heapUsed - start.mem.heapUsed,
      external: end.mem.external - start.mem.external,
      arrayBuffers: end.mem.arrayBuffers - start.mem.arrayBuffers,
    },
    memEnd: end.mem,
  };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return String(bytes);
  const sign = bytes < 0 ? "-" : "";
  let n = Math.abs(bytes);
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  const fixed = i === 0 ? n.toFixed(0) : n.toFixed(n < 10 ? 2 : 1);
  return `${sign}${fixed}${units[i]}`;
}

export async function withStep<T>(
  name: string,
  onLog: (phase: "start" | "end" | "error", fields: Record<string, unknown>) => void,
  fn: () => Promise<T>
): Promise<T> {
  const start = takeUsageSnapshot();
  onLog("start", { step: name, memStart: start.mem });

  try {
    const result = await fn();
    const end = takeUsageSnapshot();
    onLog("end", { step: name, ...diffUsage(start, end) });
    return result;
  } catch (err) {
    const end = takeUsageSnapshot();
    onLog("error", { step: name, ...diffUsage(start, end), err });
    throw err;
  }
}
