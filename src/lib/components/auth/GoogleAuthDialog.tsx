"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/lib/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/lib/components/ui/dialog";
import { Loader2, LogIn, ShieldCheck } from "lucide-react";

interface Props {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerLabel?: string;
}

const GoogleAuthDialog = ({ open, onOpenChange, triggerLabel = "Увійти" }: Props) => {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const shouldRenderTrigger = typeof open === "undefined";

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signIn("google", { redirect: false, callbackUrl: "/pers" });

      if (result?.error) {
        toast.error("Не вдалося авторизуватися", {
          description: "Google повернув помилку. Спробуйте ще раз.",
        });
        return;
      }

      if (result?.url) {
        window.location.href = result.url;
      } else {
        toast.success("Готово! Ви авторизовані.");
        onOpenChange?.(false);
      }
    } catch {
      toast.error("Не вдалося авторизуватися", {
        description: "Перевірте зʼєднання та спробуйте знову.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {shouldRenderTrigger && (
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
      )}
      <DialogContent className="sm:max-w-[420px] border border-slate-800/70 bg-slate-950/90 backdrop-blur">
        <DialogHeader>
          <DialogTitle className="text-white">Увійти через Google</DialogTitle>
          <DialogDescription className="text-slate-400">
            Швидка аутентифікація без паролів. Ми використовуємо Google лише для підтвердження пошти.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {session?.user ? (
            <div className="flex items-center justify-between rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              <span>Ви вже увійшли як {session.user.email}</span>
              <ShieldCheck className="h-4 w-4" />
            </div>
          ) : (
            <div className="rounded-lg border border-slate-800/80 bg-slate-900/70 px-3 py-2 text-sm text-slate-300">
              Авторизація потрібна для збереження персонажів та синхронізації між пристроями.
            </div>
          )}

          <Button
            onClick={handleSignIn}
            disabled={loading || status === "loading" || !!session}
            className="w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500 text-white shadow-lg shadow-indigo-500/20"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                З&apos;єднання...
              </>
            ) : session ? (
              "Ви вже авторизовані"
            ) : (
              <>
                <span className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-slate-900">
                  G
                </span>
                Продовжити з Google
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleAuthDialog;
