import { execFile } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

let server: Server | null = null;

afterEach(() => {
  server?.close();
  server = null;
});

async function startServerFailingOn(brokenPath: string | null): Promise<string> {
  server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    response.statusCode = path === brokenPath ? 500 : 200;
    response.end("ok");
  });
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server?.address() as AddressInfo).port}`;
}

async function runSmoke(baseUrl: string): Promise<{ exitCode: number; output: string }> {
  try {
    const { stdout } = await execFileAsync("bash", ["scripts/smoke.sh", baseUrl], {
      env: { ...process.env, SMOKE_BOOT_ATTEMPTS: "1", SMOKE_TIMEOUT_SECONDS: "5" },
    });
    return { exitCode: 0, output: stdout };
  } catch (failure) {
    const { code, stdout } = failure as { code: number; stdout: string };
    return { exitCode: code, output: stdout };
  }
}

describe("KR31.11 / L18-release-readiness-06 — смоук після деплою покриває редакцію 2024", () => {
  it("зелений, коли всі маршрути віддають 200", async () => {
    const result = await runSmoke(await startServerFailingOn(null));

    expect(result.exitCode).toBe(0);
  });

  it.each(["/2024/char", "/2024", "/char/create"])("червоний, коли %s віддає 500", async (brokenPath) => {
    const result = await runSmoke(await startServerFailingOn(brokenPath));

    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain(`✗`);
  });
});
