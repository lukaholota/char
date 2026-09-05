"use client";

import { useCallback, useState, useTransition } from "react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { AlertTriangle, ArrowLeft, Home, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AddBastionFacilityDialog } from "@/components/bastions/AddBastionFacilityDialog";
import { BastionMatchBadge } from "@/components/bastions/BastionPicking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModeLink } from "@/components/no-ai/ModeLink";
import { bastionOrderTranslations, bastionSpaceTranslations } from "@/lib/refs/translation";
import {
  addTurn,
  createBastionForPers,
  loadBastion,
  loadBastionPicker,
  removeBastion,
  removeFacility,
  removeTurn,
  saveBastionDetails,
  saveFacilityState,
  saveTurn,
} from "@/lib/actions/bastion-actions";
import {
  BASTION_BELOW_STANDARD_LEVEL_HINT,
  findNextTurnNumber,
  findSpecialFacilityUsage,
} from "@/rules/bastions";
import type {
  BastionFacilityView,
  BastionOrderCode,
  BastionPicker,
  BastionRecord,
  BastionStanding,
  BastionTurnRecord,
} from "@/server/db/bastions";
import { cn } from "@/lib/utils";

const textAreaClassName =
  "w-full min-h-24 rounded-md border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20";

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

  return (
    <div className="container mx-auto max-w-3xl space-y-4 px-4 py-6 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:pb-6">
      <ModeLink
        href={`/char/${current.persId}`}
        className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад до персонажа
      </ModeLink>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-50">Бастіон</h1>
        <p className="text-sm text-slate-400">
          {current.persName} · рівень {current.characterLevel}
        </p>
      </header>

      {current.bastion ? (
        <>
          <BastionDetailsForm standing={current} bastion={current.bastion} onSaved={setCurrent} />
          <BastionFacilitiesSection
            standing={current}
            picker={currentPicker}
            onChanged={setCurrent}
            onReload={reload}
          />
          <BastionTurnsSection standing={current} bastion={current.bastion} onChanged={setCurrent} />
        </>
      ) : (
        <BastionEmptyState standing={current} onCreated={setCurrent} />
      )}

      <ModeLink
        href="/2024/bastions"
        className="inline-flex items-center gap-2 text-sm text-emerald-300 hover:text-emerald-200"
      >
        <Home className="h-4 w-4" />
        Каталог приміщень бастіону
      </ModeLink>
    </div>
  );
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
    <section className="glass-panel border-gradient-rpg space-y-4 rounded-2xl p-4 sm:p-6">
      <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-emerald-300">
        Опційна система 2024
      </span>

      <p className="text-sm text-slate-300">
        Бастіон — це база персонажа: вежа, корчма, святилище чи схрон. Тут ви ведете її назву,
        антураж, приміщення й власні нотатки.
      </p>

      <BelowStandardLevelHint standing={standing} />

      {isFormOpen ? (
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.1em] text-slate-400">Назва</span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Стара вежа під Водоглибом"
              maxLength={100}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.1em] text-slate-400">Антураж</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={textAreaClassName}
              placeholder="Вежа на околиці, дісталася від наставниці"
            />
          </label>

          <Button onClick={create} disabled={isPending}>
            Створити бастіон
          </Button>
        </div>
      ) : (
        <Button onClick={() => setIsFormOpen(true)}>Створити</Button>
      )}
    </section>
  );
}

function BastionDetailsForm({
  standing,
  bastion,
  onSaved,
}: {
  standing: BastionStanding;
  bastion: BastionRecord;
  onSaved: (next: BastionStanding) => void;
}) {
  const [name, setName] = useState(bastion.name);
  const [description, setDescription] = useState(bastion.description);
  const [notes, setNotes] = useState(bastion.notes);
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const result = await saveBastionDetails({
        persId: standing.persId,
        name,
        description,
        notes,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onSaved(result.standing);
      toast.success("Збережено");
    });
  };

  const remove = () => {
    if (!isConfirmingRemoval) {
      setIsConfirmingRemoval(true);
      return;
    }

    startTransition(async () => {
      const result = await removeBastion(standing.persId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onSaved({ ...standing, bastion: null });
      toast.success("Бастіон видалено");
    });
  };

  return (
    <section className="glass-panel border-gradient-rpg space-y-4 rounded-2xl p-4 sm:p-6">
      <BelowStandardLevelHint standing={standing} />

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-[0.1em] text-slate-400">Назва</span>
        <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} />
      </label>

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-[0.1em] text-slate-400">Антураж</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className={textAreaClassName}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-[0.1em] text-slate-400">Нотатки</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className={textAreaClassName}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={isPending}>
          Зберегти
        </Button>
        <Button variant="ghost" onClick={remove} disabled={isPending} className="text-red-300">
          <Trash2 className="mr-2 h-4 w-4" />
          {isConfirmingRemoval ? "Підтвердити видалення" : "Видалити бастіон"}
        </Button>
      </div>
    </section>
  );
}

function BastionFacilitiesSection({
  standing,
  picker,
  onChanged,
  onReload,
}: {
  standing: BastionStanding;
  picker: BastionPicker | null;
  onChanged: (next: BastionStanding) => void;
  onReload: () => Promise<void>;
}) {
  const [isRemoving, startRemoving] = useTransition();

  const views = picker?.facilityViews ?? [];
  const usage = findSpecialFacilityUsage({
    characterLevel: standing.characterLevel,
    used: picker?.specialCount ?? 0,
  });

  const drop = (facilityId: number) => {
    startRemoving(async () => {
      const result = await removeFacility({ persId: standing.persId, facilityId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onChanged(result.standing);
      await onReload();
      toast.success("Приміщення прибрано");
    });
  };

  return (
    <section className="glass-panel border-gradient-rpg space-y-3 rounded-2xl p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-50">Приміщення</h2>
        <AddBastionFacilityDialog
          persId={standing.persId}
          persName={standing.persName}
          onFacilityAdded={onReload}
        />
      </div>

      <p
        className={cn(
          "inline-flex flex-wrap items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold",
          usage.isOverLimit
            ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
            : "border-white/10 bg-white/5 text-slate-300"
        )}
      >
        Спеціальних: {usage.used} / {usage.limit}
        {usage.isOverLimit ? (
          <>
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="font-normal text-amber-200/80">
              за стандартними правилами на цьому рівні їх {usage.limit}
            </span>
          </>
        ) : null}
      </p>

      {views.length === 0 ? (
        <p className="text-sm text-slate-400">Приміщень ще немає — додайте перше з каталогу.</p>
      ) : (
        <ul className="space-y-2">
          {views.map((view) => (
            <li key={view.facilityId}>
              <BastionFacilityRow
                persId={standing.persId}
                view={view}
                isRemoving={isRemoving}
                onRemove={() => drop(view.facilityId)}
                onSaved={onChanged}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/// Каталог розвʼязує сервер, за слаґом і без зовнішнього ключа (Р25): зникле з каталогу
/// приміщення має сказати «недоступне», а не мовчки випасти з листа.
function BastionFacilityRow({
  persId,
  view,
  isRemoving,
  onRemove,
  onSaved,
}: {
  persId: number;
  view: BastionFacilityView;
  isRemoving: boolean;
  onRemove: () => void;
  onSaved: (next: BastionStanding) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-semibold text-slate-100">{view.name ?? view.slug}</span>
            <span className="text-xs text-slate-400">{bastionSpaceTranslations[view.space]}</span>
          </div>

          {view.match ? (
            <BastionMatchBadge
              level={view.level}
              prerequisiteText={view.prerequisiteText}
              match={view.match}
            />
          ) : (
            <p className="mt-1 text-xs text-amber-300">Приміщення більше немає в каталозі</p>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={isRemoving}
          className="shrink-0 text-red-300"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <BastionFacilityStateForm persId={persId} view={view} onSaved={onSaved} />
    </div>
  );
}

/// Наказ поза переліком каталогу зберігається з попередженням, не блокується (Р26); захисники
/// й найманці — власний стан гравця, каталог лише підказує очікувану кількість найманців.
function BastionFacilityStateForm({
  persId,
  view,
  onSaved,
}: {
  persId: number;
  view: BastionFacilityView;
  onSaved: (next: BastionStanding) => void;
}) {
  const [order, setOrder] = useState<BastionOrderCode | "">(view.currentOrder ?? "");
  const [defenders, setDefenders] = useState(String(view.defenders));
  const [hirelings, setHirelings] = useState(view.hirelings);
  const [notes, setNotes] = useState(view.notes);
  const [isSaving, startSaving] = useTransition();

  const isOrderOutsideCatalog = order !== "" && !view.allowedOrderCodes.includes(order);

  const save = () => {
    const parsedDefenders = Number(defenders);
    startSaving(async () => {
      const result = await saveFacilityState({
        persId,
        facilityId: view.facilityId,
        currentOrder: order === "" ? null : order,
        defenders: parsedDefenders,
        hirelings,
        notes,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onSaved(result.standing);
      toast.success("Стан приміщення збережено");
    });
  };

  return (
    <div className="space-y-2 border-t border-white/10 pt-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Наказ</span>
          <select
            value={order}
            onChange={(event) => setOrder(event.target.value as BastionOrderCode | "")}
            className="w-full rounded-md border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20"
          >
            <option value="">Без наказу</option>
            {Object.entries(bastionOrderTranslations).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
                {view.allowedOrderCodes.includes(code as BastionOrderCode) ? "" : " · немає в каталозі"}
              </option>
            ))}
          </select>
          {isOrderOutsideCatalog ? (
            <span className="flex items-center gap-1 text-[11px] text-amber-300">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              Каталог не дає цього наказу цьому приміщенню
            </span>
          ) : null}
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Захисники</span>
          <Input
            type="number"
            min={0}
            value={defenders}
            onChange={(event) => setDefenders(event.target.value)}
          />
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <span className="text-[11px] uppercase tracking-[0.1em] text-slate-400">
            Найманці
            {view.expectedHirelings && view.expectedHirelings !== "—"
              ? ` · очікується ${view.expectedHirelings}`
              : ""}
          </span>
          <Input
            value={hirelings}
            onChange={(event) => setHirelings(event.target.value)}
            placeholder="Імена найманців"
          />
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <span className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Нотатки</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={textAreaClassName}
            placeholder="Кастомне формулювання наказу, план на наступний хід тощо"
          />
        </label>
      </div>

      <Button size="sm" onClick={save} disabled={isSaving}>
        Зберегти стан
      </Button>
    </div>
  );
}

/// Журнал — лог, написаний рукою гравця: сторінка не рахує ходів, не веде календаря й нічого не
/// розвʼязує (Р26 і список «свідомо не робимо» в README O19). Номер наступного ходу підставляється
/// підказкою й лишається редагованим.
function BastionTurnsSection({
  standing,
  bastion,
  onChanged,
}: {
  standing: BastionStanding;
  bastion: BastionRecord;
  onChanged: (next: BastionStanding) => void;
}) {
  const nextTurnNumber = findNextTurnNumber(bastion.turns);

  return (
    <section className="glass-panel border-gradient-rpg space-y-3 rounded-2xl p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-slate-50">Журнал ходів</h2>

      {bastion.turns.length === 0 ? (
        <p className="text-sm text-slate-400">
          Записів ще немає — запишіть, що бастіон робив між сесіями.
        </p>
      ) : (
        <ul className="space-y-2">
          {bastion.turns.map((turn) => (
            <li key={turn.turnId}>
              <BastionTurnRow persId={standing.persId} turn={turn} onChanged={onChanged} />
            </li>
          ))}
        </ul>
      )}

      <BastionTurnComposer
        key={nextTurnNumber}
        persId={standing.persId}
        nextTurnNumber={nextTurnNumber}
        onAdded={onChanged}
      />
    </section>
  );
}

function BastionTurnComposer({
  persId,
  nextTurnNumber,
  onAdded,
}: {
  persId: number;
  nextTurnNumber: number;
  onAdded: (next: BastionStanding) => void;
}) {
  const [turnNumber, setTurnNumber] = useState(String(nextTurnNumber));
  const [entry, setEntry] = useState("");
  const [isPending, startTransition] = useTransition();

  const add = () => {
    startTransition(async () => {
      const result = await addTurn({ persId, turnNumber: Number(turnNumber), entry });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEntry("");
      onAdded(result.standing);
      toast.success("Запис додано");
    });
  };

  return (
    <div className="space-y-2 border-t border-white/10 pt-3">
      <div className="grid gap-2 sm:grid-cols-[7rem_1fr]">
        <label className="block space-y-1">
          <span className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Хід №</span>
          <Input
            type="number"
            min={1}
            value={turnNumber}
            onChange={(event) => setTurnNumber(event.target.value)}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Що сталося</span>
          <textarea
            value={entry}
            onChange={(event) => setEntry(event.target.value)}
            className={textAreaClassName}
            placeholder="Бібліотека дослідила руїни, кузня закінчила лати"
          />
        </label>
      </div>

      <Button size="sm" onClick={add} disabled={isPending}>
        Додати запис
      </Button>
    </div>
  );
}

function BastionTurnRow({
  persId,
  turn,
  onChanged,
}: {
  persId: number;
  turn: BastionTurnRecord;
  onChanged: (next: BastionStanding) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);
  const [turnNumber, setTurnNumber] = useState(String(turn.turnNumber));
  const [entry, setEntry] = useState(turn.entry);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const result = await saveTurn({
        persId,
        turnId: turn.turnId,
        turnNumber: Number(turnNumber),
        entry,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setIsEditing(false);
      onChanged(result.standing);
      toast.success("Запис збережено");
    });
  };

  /// Запис журналу — рукописний текст: одного кліку на видалення для нього замало, тому та сама
  /// двокрокова згода, що й у видаленні бастіону.
  const remove = () => {
    if (!isConfirmingRemoval) {
      setIsConfirmingRemoval(true);
      return;
    }

    startTransition(async () => {
      const result = await removeTurn({ persId, turnId: turn.turnId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onChanged(result.standing);
      toast.success("Запис видалено");
    });
  };

  const cancel = () => {
    setTurnNumber(String(turn.turnNumber));
    setEntry(turn.entry);
    setIsEditing(false);
  };

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-semibold text-slate-100">Хід №{turn.turnNumber}</span>
          <span className="text-xs text-slate-400">
            {format(new Date(turn.createdAt), "d MMMM yyyy", { locale: uk })}
          </span>
        </div>

        <div className="flex shrink-0 gap-1">
          {isEditing ? null : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              disabled={isPending}
              className="text-slate-300"
              aria-label="Редагувати запис"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={remove}
            onBlur={() => setIsConfirmingRemoval(false)}
            disabled={isPending}
            className="text-red-300"
            aria-label="Видалити запис"
          >
            <Trash2 className="h-4 w-4" />
            {isConfirmingRemoval ? <span className="ml-1 text-xs">Видалити?</span> : null}
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-[7rem_1fr]">
            <label className="block space-y-1">
              <span className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Хід №</span>
              <Input
                type="number"
                min={1}
                value={turnNumber}
                onChange={(event) => setTurnNumber(event.target.value)}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] uppercase tracking-[0.1em] text-slate-400">
                Що сталося
              </span>
              <textarea
                value={entry}
                onChange={(event) => setEntry(event.target.value)}
                className={textAreaClassName}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={save} disabled={isPending}>
              Зберегти запис
            </Button>
            <Button size="sm" variant="ghost" onClick={cancel} disabled={isPending}>
              Скасувати
            </Button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm text-slate-300">{turn.entry}</p>
      )}
    </div>
  );
}

/// Рівень підказує, а не забороняє (Р26): напис зʼявляється й тоді, коли бастіон уже створений.
function BelowStandardLevelHint({ standing }: { standing: BastionStanding }) {
  if (!standing.access.isBelowStandardLevel) return null;

  return (
    <p className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      {BASTION_BELOW_STANDARD_LEVEL_HINT}
    </p>
  );
}
