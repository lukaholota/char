"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyTextToClipboard } from "@/lib/utils/copy-text";
import { buildChromeIntentUrl, type BrowserEnvironment, type InAppBrowserHost, type InAppBrowserVariant } from "@/lib/utils/in-app-browser";
import {
  buildInAppHandoffUrl,
  captureExternalBrowserSelected,
  captureInAppWarningShown,
  captureLinkCopied,
  type InAppPlacement,
} from "@/lib/monitoring/in-app-browser-events";

interface Props {
  environment: BrowserEnvironment;
  variant: Exclude<InAppBrowserVariant, "control">;
  placement: InAppPlacement;
}

type CopyState = "idle" | "copied" | "failed";

const HOST_NAMES: Record<InAppBrowserHost, string | null> = {
  telegram: "Telegram",
  threads: "Threads",
  instagram: "Instagram",
  facebook: "Facebook",
  other: null,
};

export function InAppBrowserNotice({ environment, variant, placement }: Props) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [hasTriedIntent, setHasTriedIntent] = useState(false);
  const [handoffUrl] = useState(() => (typeof window === "undefined" ? "" : buildInAppHandoffUrl(window.location.href)));
  const browserName = findBrowserName(environment);
  const intentUrl = variant === "contextual-handoff" && environment.platform === "android" ? buildChromeIntentUrl(handoffUrl) : null;

  useReportShownOnce(placement, variant);

  const copyLink = async () => {
    const method = await copyTextToClipboard(handoffUrl);
    setCopyState(method ? "copied" : "failed");
    captureLinkCopied(placement, method !== null, variant);
  };

  const openInChrome = () => {
    setHasTriedIntent(true);
    captureExternalBrowserSelected(placement, "android_intent", variant);
  };

  return (
    <section aria-labelledby="in-app-browser-title" className="space-y-3 rounded-lg border border-slate-700/70 bg-slate-900/70 p-3 text-sm text-slate-300">
      <h3 id="in-app-browser-title" className="flex items-center gap-2 font-medium text-white">
        <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" />
        Google може не пустити в цьому браузері
      </h3>
      <p>{describeContext(environment.host)} Відкрийте сторінку {browserName}, щоб увійти.</p>
      <p className="text-slate-400">Посилання відкриє цю саму сторінку, але незбережені вибори туди не перенесуться.</p>

      {intentUrl ? (
        <Button asChild className="min-h-11 w-full">
          <a href={intentUrl} onClick={openInChrome}>
            <ExternalLink aria-hidden="true" className="mr-2 h-4 w-4" />
            Відкрити в Chrome
          </a>
        </Button>
      ) : null}
      {hasTriedIntent ? <p role="status">Chrome не відкрився? Скопіюйте посилання й вставте його в Chrome.</p> : null}

      <Button type="button" variant={intentUrl ? "secondary" : "default"} className="min-h-11 w-full" onClick={() => void copyLink()}>
        <Copy aria-hidden="true" className="mr-2 h-4 w-4" />
        {copyState === "copied" ? "Посилання скопійовано" : "Скопіювати посилання"}
      </Button>
      {copyState === "copied" ? <p role="status">Вставте його в адресний рядок {findBrowserGenitive(environment)}.</p> : null}
      {copyState === "failed" ? <ManualCopyField url={handoffUrl} /> : null}

      {variant === "contextual-handoff" ? <p className="text-slate-400">{describeMenuPath(environment)}</p> : null}
    </section>
  );
}

function ManualCopyField({ url }: { url: string }) {
  const fieldRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    fieldRef.current?.focus();
    fieldRef.current?.select();
  }, []);
  return (
    <div role="status" className="space-y-2">
      <p>Не вдалося скопіювати. Виділіть адресу й скопіюйте вручну:</p>
      <input
        ref={fieldRef}
        aria-label="Посилання на цю сторінку"
        readOnly
        value={url}
        onFocus={(event) => event.currentTarget.select()}
        className="min-h-10 w-full rounded-md border border-white/15 bg-slate-950 p-2 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-arcane-400"
      />
    </div>
  );
}

function useReportShownOnce(placement: InAppPlacement, variant: InAppBrowserVariant) {
  const reportedRef = useRef(false);
  useEffect(() => {
    if (reportedRef.current) return;
    reportedRef.current = true;
    captureInAppWarningShown(placement, variant);
  }, [placement, variant]);
}

function describeContext(host: InAppBrowserHost | null): string {
  const hostName = host ? HOST_NAMES[host] : null;
  const where = hostName ? `усередині ${hostName}` : "у вбудованому браузері застосунку";
  return `Схоже, сайт відкрито ${where}. Google часто не дозволяє входити в таких браузерах.`;
}

function findBrowserName({ platform }: BrowserEnvironment): string {
  if (platform === "ios") return "у Safari";
  if (platform === "android") return "у Chrome";
  return "у звичайному браузері";
}

function findBrowserGenitive({ platform }: BrowserEnvironment): string {
  if (platform === "ios") return "Safari";
  if (platform === "android") return "Chrome";
  return "браузера";
}

function describeMenuPath({ platform }: BrowserEnvironment): string {
  if (platform === "ios") return "Або натисніть «⋯» чи «Поділитися» у кутку екрана й виберіть «Відкрити в Safari» чи «Відкрити в браузері».";
  if (platform === "android") return "Або натисніть «⋮» у кутку екрана й виберіть «Відкрити в Chrome» чи «Відкрити в браузері».";
  return "Або знайдіть у меню застосунку пункт «Відкрити в браузері».";
}
