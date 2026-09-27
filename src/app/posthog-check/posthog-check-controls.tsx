"use client";

import { capturePostHogEvent } from "@/lib/monitoring/posthog-client";

import { Button } from "@/components/ui/button";

// Хост читається саме тут, у клієнтському компоненті, а не на сервері — той самий трюк,
// що в SentryCheckControls: на сервері змінна є завжди (вона в char.env), питання в тому,
// чи вшив її `next build` у клієнтський бандл.
function findApiHost() {
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  return host ?? "НЕМАЄ — NEXT_PUBLIC_POSTHOG_HOST не потрапив у клієнтський бандл";
}

export function PostHogCheckControls() {
  return (
    <div className="mx-auto max-w-xl space-y-6 p-8 font-sans">
      <h1 className="text-2xl font-bold">Перевірка PostHog</h1>

      <p className="text-sm text-slate-400">
        api_host у клієнтському бандлі: <code>{findApiHost()}</code>
      </p>

      <Button
        variant="outline"
        onClick={() => {
          capturePostHogEvent("posthog_check", { source: "posthog-check-page" });
        }}
      >
        Надіслати перевірочну подію posthog_check
      </Button>
    </div>
  );
}
