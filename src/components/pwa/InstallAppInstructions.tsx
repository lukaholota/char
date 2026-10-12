"use client";

import { useState, useSyncExternalStore } from "react";
import { ChevronsDown, Copy, EllipsisVertical, Ellipsis, PlusSquare, Share, Smartphone, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { readOfflineQueue, subscribeToOfflineQueue } from "@/lib/offline/queue";
import { useInstallPath } from "@/lib/pwa/install-prompt";
import type { InstallPath } from "@/lib/pwa/install-platform";

function readPendingCount() { return readOfflineQueue().length; }

export function InstallAppInstructions({ path, onClose }: { path: InstallPath; onClose: () => void }) {
  const currentPath = useInstallPath();
  const pendingCount = useSyncExternalStore(subscribeToOfflineQueue, readPendingCount, () => 0);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const isIos = path === "ios-safari" || path === "ios-other-browser";
  const isInApp = path === "in-app-browser";

  async function copyLink() {
    if (!navigator.clipboard?.writeText) { setCopyState("failed"); return; }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState("copied");
    } catch (error) {
      if (!(error instanceof DOMException)) throw error;
      setCopyState("failed");
    }
  }

  if (currentPath === "installed") return null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md gap-4 overflow-y-auto overscroll-contain p-5">
        <DialogHeader>
          <DialogTitle className="font-rpg-display text-2xl normal-case">Встановити застосунок</DialogTitle>
          <DialogDescription>Іконка ДнД на головному екрані — швидкий доступ до персонажів і кубиків.</DialogDescription>
        </DialogHeader>
        {(isIos || isInApp) && pendingCount > 0 ? <p role="status" className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">Є ненадіслані зміни: {pendingCount}. Спершу дочекайтеся синхронізації. На iPhone встановлений застосунок має окреме сховище від браузера.</p> : null}
        {isInApp ? (
          <div className="space-y-3 text-sm">
            <p>Відкрийте це посилання у Safari на iPhone або Chrome на Android. У браузері чату встановлення недоступне.</p>
            <Button type="button" className="min-h-10 w-full" onClick={() => void copyLink()}><Copy className="mr-2 h-4 w-4" />{copyState === "copied" ? "Посилання скопійовано" : "Скопіювати посилання"}</Button>
            {copyState === "failed" ? <div role="status"><p>Не вдалося скопіювати. Виділіть і скопіюйте адресу:</p><input aria-label="Посилання на сторінку" readOnly value={window.location.href} onFocus={(event) => event.currentTarget.select()} className="mt-2 min-h-10 w-full rounded-md border border-white/15 bg-slate-900 p-2" /></div> : null}
            {copyState === "copied" ? <p role="status" className="text-slate-300">Вставте посилання в адресний рядок браузера.</p> : null}
          </div>
        ) : <ol className="space-y-4 text-sm text-slate-200">
          {listInstallSteps(path).map(({ icon: Icon, text }, index) => (
            <li key={text} className="flex gap-3">
              <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-slate-100">{index + 1}</span>
              <span className="min-w-0 flex-1">{text}</span>
              <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
            </li>
          ))}
        </ol>}
        {path === "ios-other-browser" ? <p className="text-sm text-slate-400">Немає такої дії? Відкрийте сайт у Safari.</p> : null}
      </DialogContent>
    </Dialog>
  );
}

// Safari 26+ hides Share behind «•••»; holding the address bar opens the same menu.
function listInstallSteps(path: InstallPath): { icon: LucideIcon; text: string }[] {
  if (path === "ios-safari") return [
    { icon: Ellipsis, text: "Натисніть «•••» біля адресного рядка або затисніть сам адресний рядок. Виберіть «Поширити». У старіших iOS кнопка «Поширити» (квадрат зі стрілкою) — одразу на панелі Safari." },
    { icon: ChevronsDown, text: "Прогорніть список дій донизу й натисніть «Переглянути ще»." },
    { icon: PlusSquare, text: "Виберіть «На початковий екран»." },
    { icon: Smartphone, text: "Залиште ввімкненим «Відкрити як вебзастосунок» і натисніть «Додати»." },
  ];
  if (path === "ios-other-browser") return [
    { icon: Share, text: "Натисніть «Поширити» — у Chrome він в адресному рядку або в меню «•••»." },
    { icon: PlusSquare, text: "Виберіть «На початковий екран». Якщо пункту не видно, прогорніть список і натисніть «Переглянути ще»." },
    { icon: Smartphone, text: "Натисніть «Додати»." },
  ];
  return [
    { icon: EllipsisVertical, text: "Відкрийте меню браузера — «⋮» праворуч від адресного рядка." },
    { icon: PlusSquare, text: "Виберіть «Встановити застосунок» або «Додати на головний екран»." },
    { icon: Smartphone, text: "Підтвердьте встановлення. Іконка ДнД зʼявиться серед застосунків." },
  ];
}
