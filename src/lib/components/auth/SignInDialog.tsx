"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExternalLink, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { buildReturnUrl } from "@/lib/utils/in-app-browser";
import { useInAppBrowser } from "@/lib/components/auth/use-in-app-browser";
import { InAppBrowserNotice } from "@/lib/components/auth/InAppBrowserNotice";
import { PasswordSignInForm } from "@/lib/components/auth/PasswordSignInForm";
import { announceSignedIn, rememberSignInAttempt } from "@/lib/auth/sign-in-notice";
import {
  captureAuthFailed, captureAuthRequested, captureInAppWarningDismissed, captureInAppWarningShown, prepareGoogleAuthRedirect, type AuthTrigger,
} from "@/lib/monitoring/funnel-analytics";

interface Props {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerLabel?: string;
  trigger?: React.ReactNode;
  callbackUrl?: string;
  analyticsTrigger?: AuthTrigger;
  isFromCreatorDraft?: boolean;
}

const SignInDialog = ({
  open,
  onOpenChange,
  triggerLabel = "Увійти",
  trigger,
  callbackUrl,
  analyticsTrigger = "other",
  isFromCreatorDraft = false,
}: Props) => {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const inAppBrowser = useInAppBrowser();
  const isEmbeddedForGuest = !session && (inAppBrowser?.isEmbedded ?? false);
  const variant = inAppBrowser?.variant ?? "contextual";
  const isHardBlocked = isEmbeddedForGuest && variant === "control";

  const [internalOpen, setInternalOpen] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const shouldRenderTrigger = typeof open === "undefined";
  const effectiveOpen = typeof open === "boolean" ? open : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isEmbeddedForGuest) captureInAppWarningDismissed("auth_dialog", "close", variant);
    if (!nextOpen) setIsRegister(false);
    setOpen(nextOpen);
  };

  useEffect(() => {
    if (effectiveOpen && isHardBlocked) captureInAppWarningShown("auth_dialog", "control");
  }, [effectiveOpen, isHardBlocked]);

  useEffect(() => {
    if (effectiveOpen && !session) captureAuthRequested(analyticsTrigger);
  }, [effectiveOpen, session, analyticsTrigger]);

  const getCurrentUrl = () => {
    if (typeof window === "undefined") return pathname || "/";
    return `${window.location.pathname}${window.location.search}`;
  };

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return buildReturnUrl(window.location.href);
  }, []);

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await window.navigator.clipboard.writeText(shareUrl);
      toast.success("Посилання скопійовано", {
        description: "Відкрийте його у Safari або Chrome.",
      });
    } catch {
      toast.error("Не вдалося скопіювати", {
        description: "Спробуйте виділити адресу в адресному рядку та скопіювати вручну.",
      });
    }
  };

  const handleSignIn = async () => {
    if (isEmbeddedForGuest) captureInAppWarningDismissed("auth_dialog", "continue_here", variant);
    setLoading(true);
    try {
      const result = await signIn("google", {
        redirect: false,
        callbackUrl: prepareGoogleAuthRedirect(callbackUrl ?? getCurrentUrl(), analyticsTrigger),
      });

      if (result?.error) {
        captureAuthFailed("google_redirect", "provider_error");
        toast.error("Не вдалося авторизуватися", {
          description: "Google повернув помилку. Спробуйте ще раз.",
        });
        return;
      }

      if (result?.url) {
        rememberSignInAttempt();
        window.location.href = result.url;
      } else {
        announceSignedIn(undefined);
        setOpen(false);
      }
    } catch {
      captureAuthFailed("google_redirect", "network");
      toast.error("Не вдалося авторизуватися", {
        description: "Перевірте зʼєднання та спробуйте знову.",
      });
    } finally {
      setLoading(false);
    }
  };

  const googleButton = (
    <Button
      onClick={handleSignIn}
      disabled={loading || status === "loading" || isHardBlocked}
      variant="outline"
      className="h-11 w-full border-slate-600 bg-slate-900 text-white hover:bg-slate-800 hover:text-white"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Зʼєднання…
        </>
      ) : isHardBlocked ? (
        "Відкрийте у Safari/Chrome"
      ) : isEmbeddedForGuest ? (
        "Все одно спробувати Google"
      ) : (
        <>
          <span aria-hidden="true" className="mr-2 font-semibold text-sky-400">G</span>
          Продовжити з Google
        </>
      )}
    </Button>
  );

  const hardBlockedGoogleNotice = (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-800/80 bg-slate-900/70 px-3 py-2 text-sm text-slate-300">
        <div className="mb-1 flex items-center gap-2 text-white">
          <ExternalLink className="h-4 w-4" />
          Google-логін не працює у вбудованому браузері
        </div>
        Відкрийте сайт у Safari чи Chrome: меню (⋯) у застосунку → «Відкрити в браузері».
      </div>
      <Button onClick={handleCopyLink} variant="secondary" className="w-full">
        Скопіювати посилання
      </Button>
    </div>
  );

  return (
    <Dialog open={effectiveOpen} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        shouldRenderTrigger && (
          <DialogTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="border border-slate-700/70 bg-white/5 text-white hover:bg-white/10"
            >
              <LogIn className="mr-2 h-4 w-4" />
              {triggerLabel}
            </Button>
          </DialogTrigger>
        )
      )}
      <DialogContent className="max-h-[92dvh] overflow-y-auto border border-slate-800/70 bg-slate-950/90 backdrop-blur [@media(pointer:coarse)]:bg-slate-950 sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-white">{isRegister ? "Реєстрація" : "Вхід"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Персонажі зберігаються в акаунті й відкриваються з будь-якого пристрою.
          </DialogDescription>
        </DialogHeader>

        {session?.user ? (
          <div className="flex items-center justify-between rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            <span data-ph-mask>Ви вже увійшли як {session.user.email}</span>
            <ShieldCheck className="h-4 w-4" />
          </div>
        ) : (
          <div className="space-y-4">
            {isFromCreatorDraft ? (
              <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                Ваші вибори збережені. Після входу ви повернетеся сюди й зможете створити персонажа.
              </p>
            ) : null}
            {isEmbeddedForGuest ? (
              <>
                <PasswordSignInForm callbackUrl={callbackUrl ?? getCurrentUrl()} onModeChange={setIsRegister} />
                <OrDivider label="або через Google" />
                {inAppBrowser && variant !== "control" ? <InAppBrowserNotice environment={inAppBrowser.environment} variant={variant} placement="auth_dialog" /> : hardBlockedGoogleNotice}
                {googleButton}
              </>
            ) : (
              <>
                {googleButton}
                <OrDivider label="або поштою" />
                <PasswordSignInForm callbackUrl={callbackUrl ?? getCurrentUrl()} onModeChange={setIsRegister} />
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

function OrDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-slate-500" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-slate-800" />
      {label}
      <span className="h-px flex-1 bg-slate-800" />
    </div>
  );
}

export default SignInDialog;
