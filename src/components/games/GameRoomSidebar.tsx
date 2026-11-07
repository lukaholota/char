"use client";

import { useEffect, useState, useTransition } from "react";
import { Copy, Crown, RefreshCw, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { Button } from "@/components/ui/button";
import { removeGameSessionMemberAction, rotateInviteTokenAction } from "@/lib/actions/game-sessions";
import { cn } from "@/lib/utils";
import type { GameSessionMemberView, GameSessionView } from "@/server/db/game-sessions";
import { GameAvatar } from "./GameAvatar";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { askToConfirm } from "@/components/ui/confirm-dialog";

export const ROOM_CARD = "space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4";

export function GameRoomMembers({ view }: { view: GameSessionView }) {
  return (
    <section aria-labelledby="game-room-members" className={ROOM_CARD}>
      <h2 id="game-room-members" className="font-rpg-display text-lg text-slate-100">Учасники · {view.members.length}</h2>
      <ul className="space-y-1">
        {view.members.map((member) => (
          <MemberRow key={member.userId} view={view} member={member} />
        ))}
      </ul>
    </section>
  );
}

function MemberRow({ view, member }: { view: GameSessionView; member: GameSessionMemberView }) {
  const router = useModeRouter();
  const [isPending, startTransition] = useTransition();
  const canRemove = view.myRole === "GM" && member.userId !== view.myUserId;
  const remove = async () => {
    if (!(await askToConfirm({ title: `Вилучити ${member.name} з кімнати?`, description: "Повернутися можна лише за запрошенням.", confirmLabel: "Вилучити", isDestructive: true }))) return;
    startTransition(async () => {
      const result = await removeGameSessionMemberAction(view.id, member.userId);
      if (!result.ok) return void toast.error(result.error);
      captureGameEvent("game_member_removed", {});
      toast(`${member.name} більше не в кімнаті`, { description: "Якщо в гравця лишилося запрошення, оновіть посилання." });
      router.refresh();
    });
  };
  return (
    <li className="flex min-h-12 items-center gap-3">
      <div className="relative shrink-0">
        <GameAvatar src={member.avatarUrl} name={member.persName ?? member.name} className="h-9 w-9 text-base" />
        <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900", member.isOnline ? "bg-emerald-400" : "bg-slate-600")} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 truncate text-sm text-slate-100">
          {member.role === "GM" ? <Crown className="h-3 w-3 shrink-0 text-arcane-300" aria-label="Майстер" /> : null}
          {member.name}
          {member.userId === view.myUserId ? <span className="text-slate-400"> (ви)</span> : null}
        </div>
        <div className="truncate text-xs text-slate-400">
          {member.persName ?? (member.role === "GM" ? "Майстер" : "Без персонажа")}
          <span className="sr-only">{member.isOnline ? ", у мережі" : ", не в мережі"}</span>
        </div>
      </div>
      {canRemove ? (
        <button type="button" onClick={remove} disabled={isPending} aria-label={`Вилучити ${member.name}`} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-rose-200 disabled:opacity-60">
          <UserMinus className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </li>
  );
}

/// Поки майстер у кімнаті сам, запрошення — наступний крок, тому воно велике й над журналом.
export function GameRoomInvite({ view, isProminent = false }: { view: GameSessionView; isProminent?: boolean }) {
  const router = useModeRouter();
  const [isPending, startTransition] = useTransition();
  const [rotated, setRotated] = useState<{ from: string | null; token: string } | null>(null);
  const origin = useClientOrigin();
  const token = rotated?.from === view.inviteToken ? rotated.token : view.inviteToken;
  if (!token || !origin) return null;
  const link = `${origin}/games/join/${token}`;
  const copy = () => void navigator.clipboard.writeText(link).then(() => {
    toast.success("Посилання скопійовано");
    captureGameEvent("game_invite_copied", { member_count: view.members.length });
  }, () => toast.error("Не вдалося скопіювати — виділіть посилання вручну"));
  const rotate = async () => {
    if (!(await askToConfirm({ title: "Створити нове посилання?", description: "Старе посилання перестане працювати. Учасники, що вже в кімнаті, лишаться.", confirmLabel: "Створити" }))) return;
    startTransition(async () => {
      const result = await rotateInviteTokenAction(view.id);
      if (!result.ok) return void toast.error(result.error);
      setRotated({ from: view.inviteToken, token: result.value.inviteToken });
      captureGameEvent("game_invite_rotated", {});
      toast.success("Нове посилання готове, старе більше не діє");
      router.refresh();
    });
  };
  const buttonClass = isProminent ? "h-12 w-full gap-2 px-6 text-base sm:w-auto" : "h-11 w-full gap-2";
  return (
    <section aria-labelledby="game-room-invite" className={isProminent ? "space-y-4 rounded-2xl border border-white/15 bg-slate-900/70 p-5 sm:p-6" : ROOM_CARD}>
      <div className="space-y-1">
        <h2 id="game-room-invite" className={cn("font-rpg-display text-slate-50", isProminent ? "text-2xl" : "text-lg")}>{isProminent ? "Покличте гравців" : "Запрошення"}</h2>
        <p className="text-sm text-slate-400">Надішліть посилання в чат партії. Хто відкриє його й увійде, стане гравцем кімнати.</p>
      </div>
      <input readOnly value={link} aria-label="Посилання-запрошення" onFocus={(event) => event.currentTarget.select()} className={cn("w-full truncate rounded-lg border border-white/10 bg-slate-950/60 px-3 text-slate-200", isProminent ? "h-12 text-sm" : "h-10 text-xs")} />
      <Button type="button" size="lg" onClick={copy} className={buttonClass}>
        <Copy className="h-4 w-4 shrink-0" aria-hidden />
        Копіювати посилання
      </Button>
      <button type="button" onClick={rotate} disabled={isPending} className="inline-flex min-h-10 items-center gap-2 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-60">
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        Зробити нове посилання
      </button>
    </section>
  );
}

function useClientOrigin() {
  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => setOrigin(window.location.origin), []);
  return origin;
}
