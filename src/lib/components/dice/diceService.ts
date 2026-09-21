// Singleton service for @3d-dice/dice-box
// Manages DiceBox instance and provides roll API

import * as Sentry from "@sentry/nextjs";
import type DiceBox from "@3d-dice/dice-box";
import { rollFallbackDice, type FallbackDie } from "./dice-fallback";

type RollResult = {
  notation: string;
  total: number;
  rolls: Array<{ sides: number; value: number; rollId?: number | string }>;
};

type RollCallback = (result: RollResult) => void;

export type DiceStatus = "loading" | "ready" | "fallback";

// На частині телефонів (Sentry -8/-A, D-005) фізичний воркер dice-box так і не піднімає Ammo:
// `init()` не завершується ніколи, а кнопки кубиків лишаються мертвими. Після цього часу
// кидки йдуть числовим фолбеком — без анімації, але з результатом.
const INIT_TIMEOUT_MS = 12_000;
const FALLBACK_SETTLE_MS = 350;
const NARROW_SCREEN_PX = 640;

class DiceService {
  private box: DiceBox | null = null;
  private status: DiceStatus = "loading";
  private initPromise: Promise<void> | null = null;
  private onRollCompleteCallback: RollCallback | null = null;
  private statusListeners = new Set<() => void>();
  private fallbackTable: FallbackDie[] = [];
  private fallbackNextRollId = 1;

  async init(containerSelector: string): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initOrFallBack(containerSelector);
    return this.initPromise;
  }

  private async initOrFallBack(containerSelector: string): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => resolve("timeout"), INIT_TIMEOUT_MS);
    });

    try {
      const outcome = await Promise.race([this.createBox(containerSelector).then(() => "ready" as const), timeout]);
      if (outcome === "timeout") this.enterFallback("dice-box init timed out");
    } catch (error) {
      this.enterFallback(error instanceof Error ? error.message : String(error));
    } finally {
      clearTimeout(timer);
    }
  }

  private async createBox(containerSelector: string): Promise<void> {
    // Dynamic import to avoid SSR issues
    const { default: DiceBox } = await import("@3d-dice/dice-box");

    // Кидок удвічі швидший за колишній (gravity 2, сили 6/5, загасання 0.4) при тій самій траєкторії:
    // фізика крокує реальним часом кадру, тож подвоєння темпу — це гравітація ×4 (рушій додає до неї
    // mass/3: (2 + 1/3) × 4 − 1/3 = 9), швидкості ×2, а загасання d′ = 1 − (1 − d)².
    const box = new DiceBox(containerSelector, {
      assetPath: "/assets/dice-box/",
      gravity: 9,
      mass: 1,
      friction: 0.8,
      restitution: 0.5,
      angularDamping: 0.64,
      linearDamping: 0.64,
      spinForce: 12,
      throwForce: 10,
      startingHeight: 8,
      settleTimeout: 5000,
      offscreen: true,
      delay: 10,
      lightIntensity: 1,
      enableShadows: true,
      shadowTransparency: 0.8,
      theme: "default",
      scale: 6,
    });

    await box.init();

    // Пізня ініціалізація після таймауту фолбек не скасовує: стіл з числовими кубиками вже
    // показаний, а перемикання посеред сесії дало б два джерела результатів.
    if (this.status === "fallback") return;

    // `box` стає видимим решті сервісу лише після `init()`: до нього всередині dice-box ще
    // немає світу, і `updateConfig`/`roll` падали з `loadTheme is not a function`
    // (Sentry JAVASCRIPT-NEXTJS-V).
    this.box = box;
    box.onRollComplete = (results: unknown) => this.emitBoxResults(results);
    this.setStatus("ready");
    console.log("DiceBox initialized successfully");
  }

  private enterFallback(reason: string) {
    if (this.status !== "loading") return;
    this.setStatus("fallback");
    console.warn(`DiceBox unavailable, rolling without 3D: ${reason}`);
    Sentry.captureMessage("dice-box fallback", { level: "warning", tags: { dice_fallback_reason: reason.slice(0, 80) } });
  }

  private setStatus(status: DiceStatus) {
    this.status = status;
    for (const listener of this.statusListeners) listener();
  }

  private emitBoxResults(results: unknown) {
    if (!this.onRollCompleteCallback || !Array.isArray(results)) return;

    const rolls: RollResult["rolls"] = [];
    for (const group of results) {
      if (group && typeof group === "object" && "rolls" in group) {
        const groupRolls = (group as { rolls: RollResult["rolls"] }).rolls;
        for (const roll of groupRolls) {
          rolls.push({ sides: roll.sides, value: roll.value, rollId: roll.rollId });
        }
      }
    }

    this.emitRolls(rolls);
  }

  private emitRolls(rolls: RollResult["rolls"]) {
    this.onRollCompleteCallback?.({
      notation: "",
      total: rolls.reduce((sum, roll) => sum + roll.value, 0),
      rolls,
    });
  }

  private rollFallback(notations: string[], append: boolean) {
    const fresh = rollFallbackDice(notations, this.fallbackNextRollId);
    this.fallbackNextRollId += fresh.length;
    this.fallbackTable = append ? [...this.fallbackTable, ...fresh] : fresh;
    const snapshot = [...this.fallbackTable];
    setTimeout(() => this.emitRolls(snapshot), FALLBACK_SETTLE_MS);
  }

  async roll(count: number, sides: number, options?: { append?: boolean }): Promise<void> {
    const notation = `${count}d${sides}`;

    if (this.status === "fallback") {
      this.rollFallback([notation], Boolean(options?.append));
      return;
    }

    if (!this.box) {
      console.warn("DiceBox not initialized");
      return;
    }

    try {
      // Use newStartPoint: true to get random spawn points along box edges
      if (options?.append) {
        await (this.box as any).add(notation, { newStartPoint: true });
      } else {
        await this.box.roll(notation, { newStartPoint: true });
      }
    } catch (error) {
      console.error("Roll failed:", error);
    }
  }

  async rollMany(notations: string[]): Promise<void> {
    const clean = notations
      .map((n) => String(n || "").trim())
      .filter((n) => /^\d+d\d+$/i.test(n));

    if (!clean.length) return;

    if (this.status === "fallback") {
      this.rollFallback(clean, false);
      return;
    }

    if (!this.box) {
      console.warn("DiceBox not initialized");
      return;
    }

    try {
      await this.box.roll(clean as any, { newStartPoint: true });
    } catch (error) {
      console.error("Roll many failed:", error);
    }
  }

  setVisualPreset(preset: "free" | "roll"): void {
    if (!this.box) return;

    const isNarrowScreen = window.innerWidth < NARROW_SCREEN_PX;
    const scale = preset === "roll" ? (isNarrowScreen ? 6 : 8) : isNarrowScreen ? 5 : 6;

    try {
      (this.box as any).updateConfig?.({ scale });
    } catch (error) {
      console.warn("Failed to update dice visual preset:", error);
    }
  }

  async removeByRollId(rollId: number | string): Promise<void> {
    if (this.status === "fallback") {
      this.fallbackTable = this.fallbackTable.filter((die) => die.rollId !== rollId);
      return;
    }

    if (!this.box) return;

    try {
      await (this.box as any).remove([{ rollId }], { hide: false });
    } catch (error) {
      console.error("Remove die failed:", error);
    }
  }

  onRollComplete(callback: RollCallback): void {
    this.onRollCompleteCallback = callback;
  }

  clear(): void {
    this.fallbackTable = [];
    if (this.box) {
      this.box.clear();
    }
  }

  isInitialized(): boolean {
    return this.status !== "loading";
  }

  isFallback(): boolean {
    return this.status === "fallback";
  }

  getStatus(): DiceStatus {
    return this.status;
  }

  subscribeStatus(listener: () => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }
}

// Export singleton instance
export const diceService = new DiceService();
