"use client";

import { useCallback, useState, useTransition } from "react";
import { ArrowLeft, Home } from "lucide-react";
import { toast } from "sonner";
import { BelowStandardLevelHint } from "@/components/bastions/BastionFacilityBasics";
import { BastionFacilitySections } from "@/components/bastions/BastionFacilitySections";
import { BastionHeader } from "@/components/bastions/BastionHeader";
import { BastionJournal } from "@/components/bastions/BastionJournal";
import { BastionTurnPanel } from "@/components/bastions/BastionTurnPanel";
import { bastionFieldLabelClassName, bastionSectionClassName, bastionTextAreaClassName } from "@/components/bastions/bastion-field-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModeLink } from "@/components/no-ai/ModeLink";
import { createBastionForPers, loadBastion, loadBastionPicker } from "@/lib/actions/bastion-actions";
import type { BastionFacilityView, BastionPicker, BastionStanding } from "@/server/db/bastions";

export function BastionPageClient({
  standing,
  picker,
}: {
  standing: BastionStanding;
  picker: BastionPicker | null;
}) {
  const [current, setCurrent] = useState(standing);
  const [currentPicker, setCurrentPicker] = useState(picker);

  const reload = useCallback(async () => {
    const [reloaded, reloadedPicker] = await Promise.all([
      loadBastion(current.persId),
      loadBastionPicker(current.persId),
    ]);
    if (reloaded.ok) setCurrent(reloaded.standing);
    if (reloadedPicker.ok) setCurrentPicker(reloadedPicker.picker);
  }, [current.persId]);

  const views = currentPicker?.facilityViews ?? [];
  const isTurnFirst = hasTurnActivity(views, current.bastion?.turns.length ?? 0);
  const turnPanel = current.bastion ? (
    <BastionTurnPanel standing={current} bastion={current.bastion} views={views} onChanged={setCurrent} />
  ) : null;

  const catalogLink = (
    <ModeLink
      href="/2024/bastions"
      className="inline-flex min-h-10 items-center gap-2 text-sm text-emerald-300 hover:text-emerald-200"
    >
      <Home className="h-4 w-4" />
      Каталог приміщень бастіону
    </ModeLink>
  );

  return (
    <div className="container mx-auto max-w-6xl space-y-4 px-4 py-6 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:pb-6">
      <ModeLink
        href={`/char/${current.persId}`}
        className="inline-flex min-h-10 items-center gap-2 text-sm text-slate-300 hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад до персонажа
      </ModeLink>

      {current.bastion ? (
        <div className={bastionPageGridClassName}>
          <div className="contents lg:block lg:space-y-4">
            <div className="order-1">
              <BastionHeader standing={current} bastion={current.bastion} views={views} onChanged={setCurrent} />
            </div>
            <div className="order-3 space-y-4">
              <BastionFacilitySections standing={current} picker={currentPicker} onChanged={reload} />
            </div>
            <div className="order-6">{catalogLink}</div>
          </div>
          <div className="contents lg:block lg:space-y-4">
            <div className={isTurnFirst ? "order-2" : "order-4"}>{turnPanel}</div>
            <div className="order-5">
              <BastionJournal persId={current.persId} bastion={current.bastion} onChanged={setCurrent} />
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl space-y-4">
          <BastionEmptyState standing={current} onCreated={setCurrent} />
          {catalogLink}
        </div>
      )}
    </div>
  );
}

/// На телефоні — одна колонка в порядку `order-*`; від `lg` — приміщення зліва, хід і журнал справа.
const bastionPageGridClassName = "flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start";

/// Поки немає ні спеціальних приміщень, ні записів, хід бастіону нічого не показує — першими йдуть приміщення.
function hasTurnActivity(views: readonly BastionFacilityView[], turnCount: number): boolean {
  return turnCount > 0 || views.some((view) => view.match?.isSpecial || view.currentOrder !== null);
}

function BastionEmptyState({
  standing,
  onCreated,
}: {
  standing: BastionStanding;
  onCreated: (next: BastionStanding) => void;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  const create = () => {
    startTransition(async () => {
      const result = await createBastionForPers({ persId: standing.persId, name, description });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onCreated(result.standing);
      toast.success("Бастіон створено");
    });
  };

  return (
    <section className={bastionSectionClassName}>
      <header className="space-y-1">
        <p className="text-sm text-slate-400">
          <span className="text-xs uppercase tracking-[0.1em] text-emerald-300/90">Опційна система 2024</span> · {standing.persName} · рівень{" "}
          {standing.characterLevel}
        </p>
        <h1 className="text-2xl font-bold text-slate-50 sm:text-3xl">Бастіон</h1>
      </header>

      <p className="text-base leading-relaxed text-slate-300">
        Бастіон — це база персонажа: вежа, корчма, святилище чи схрон. Між пригодами його приміщення
        виконують накази, а тут ви бачите, що в бастіоні є і що він робить.
      </p>

      <BelowStandardLevelHint standing={standing} />

      {isFormOpen ? (
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className={bastionFieldLabelClassName}>Назва</span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Стара вежа під Водоглибом"
              maxLength={100}
            />
          </label>

          <label className="block space-y-1">
            <span className={bastionFieldLabelClassName}>Антураж</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={bastionTextAreaClassName}
              placeholder="Вежа на околиці, дісталася від наставниці"
            />
          </label>

          <Button onClick={create} disabled={isPending}>
            Створити бастіон
          </Button>
        </div>
      ) : (
        <Button onClick={() => setIsFormOpen(true)}>Створити бастіон</Button>
      )}
    </section>
  );
}
