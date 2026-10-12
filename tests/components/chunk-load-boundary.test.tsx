// @vitest-environment jsdom
import { Component, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/lib/monitoring/report-error", () => ({ reportBoundaryError: vi.fn() }));

import { ChunkLoadBoundary } from "@/components/errors/ChunkLoadBoundary";
import { reportBoundaryError } from "@/lib/monitoring/report-error";

const chunkError = () => new Error("Failed to load chunk /_next/static/chunks/a.js from module 1");

function Thrower({ error }: { error: Error }): ReactNode {
  throw error;
}

class OuterBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }

  render() {
    return this.state.message ? <p>Зовнішня межа: {this.state.message}</p> : this.props.children;
  }
}

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", { value, configurable: true });
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(reportBoundaryError).mockClear();
  setOnline(true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Межа чанка: відсутній ліниво завантажуваний шматок не валить увесь лист", () => {
  it("здорові діти малюються як є", () => {
    render(
      <ChunkLoadBoundary fallback={<p>запасний</p>}>
        <p>слайд</p>
      </ChunkLoadBoundary>,
    );
    expect(screen.getByText("слайд")).toBeTruthy();
    expect(screen.queryByText("запасний")).toBeNull();
  });

  it("чанк не завантажився — замість нього запасний вміст, зовнішня межа не чіпається", () => {
    render(
      <OuterBoundary>
        <ChunkLoadBoundary fallback={<p>запасний</p>}>
          <Thrower error={chunkError()} />
        </ChunkLoadBoundary>
      </OuterBoundary>,
    );
    expect(screen.getByText("запасний")).toBeTruthy();
    expect(screen.queryByText(/Зовнішня межа/)).toBeNull();
  });

  it("інша помилка — справжній баг — іде до зовнішньої межі, а не ховається", () => {
    render(
      <OuterBoundary>
        <ChunkLoadBoundary fallback={<p>запасний</p>}>
          <Thrower error={new TypeError("Cannot read properties of undefined")} />
        </ChunkLoadBoundary>
      </OuterBoundary>,
    );
    expect(screen.queryByText("запасний")).toBeNull();
    expect(screen.getByText(/Зовнішня межа: Cannot read properties of undefined/)).toBeTruthy();
    expect(reportBoundaryError).not.toHaveBeenCalled();
  });

  it("онлайн збій чанка звітується (старий деплой, битий CDN), офлайн — ні (очікувана ситуація)", () => {
    render(
      <ChunkLoadBoundary fallback={<p>запасний</p>}>
        <Thrower error={chunkError()} />
      </ChunkLoadBoundary>,
    );
    expect(reportBoundaryError).toHaveBeenCalledTimes(1);
    cleanup();

    setOnline(false);
    vi.mocked(reportBoundaryError).mockClear();
    render(
      <ChunkLoadBoundary fallback={<p>запасний</p>}>
        <Thrower error={chunkError()} />
      </ChunkLoadBoundary>,
    );
    expect(screen.getByText("запасний")).toBeTruthy();
    expect(reportBoundaryError).not.toHaveBeenCalled();
  });
});
