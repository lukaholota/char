"use client";

import { PawPrint, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { subclassTranslations } from "@/lib/refs/translation";
import { describeKnownFormsOverflow } from "@/rules/wildshape";
import type { AttachedForm, WildshapeStanding } from "@/server/db/wildshape";
import type { WildshapeUses } from "@/server/db/wildshape-uses";
import { detachWildshapeForm, enterWildshapeForm } from "@/server/db/wildshape-actions";
import { AddWildshapeFormDialog } from "./AddWildshapeFormDialog";
import { ActiveForm } from "./WildshapeActiveForm";
import type { WildshapeState } from "./useWildshapeState";

/// Модуль Дикої форми на листі: точка входу поруч з атаками. Стан приїжджає готовим з каруселі —
/// той самий, за яким лист малює другий шар, інакше картка й лист розійшлися б у тому, хто ти
/// зараз.

interface WildshapeCardProps {
  persId: number;
  persName: string;
  isReadOnly?: boolean;
  wildshape: WildshapeState;
}

export function WildshapeCard({ persId, persName, isReadOnly, wildshape }: WildshapeCardProps) {
  const { forms, standing, active, uses, isLoaded, isPending, reload } = wildshape;

  // Персонаж без Дикої форми не бачить модуля взагалі — це не порожній стан, а відсутність фічі.
  if (!isLoaded || !standing?.limits) return null;

  return (
    <Card className="bg-slate-900/50 border-white/10 overflow-hidden">
      <CardHeader className="p-4 flex flex-row items-center justify-between border-b border-white/5 bg-white/5">
        <CardTitle className="text-base font-bold flex items-center gap-2 text-emerald-300 uppercase tracking-wider">
          <PawPrint className="w-5 h-5" />
          Дика форма
        </CardTitle>
        {!isReadOnly && !active && (
          <AddWildshapeFormDialog
            persId={persId}
            persName={persName}
            ruleset={standing.ruleset}
            onAdded={reload}
          >
            <Button size="sm" variant="ghost" className="h-8 gap-1 px-2">
              <Plus className="w-4 h-4" />
              Форма
            </Button>
          </AddWildshapeFormDialog>
        )}
      </CardHeader>

      <CardContent className="p-3 space-y-3">
        <LimitsLine standing={standing} uses={uses} attachedCount={forms.length} />

        {active ? (
          <ActiveForm
            active={active}
            persId={persId}
            isReadOnly={isReadOnly}
            isPending={isPending}
            onChanged={reload}
          />
        ) : (
          <AttachedFormList
            forms={forms}
            persId={persId}
            isReadOnly={isReadOnly}
            isPending={isPending}
            onChanged={reload}
          />
        )}
      </CardContent>
    </Card>
  );
}

/// Пороги рівнів приходять із правил готовим текстом (`describeWildshapeLimits`) — картка їх не
/// складає. Лазіння названо явно: мовчання про нього вже коштувало години перевірки правила.
function LimitsLine({
  standing,
  uses,
  attachedCount,
}: {
  standing: WildshapeStanding;
  uses: WildshapeUses | null;
  attachedCount: number;
}) {
  const overflow = describeKnownFormsOverflow({ attached: attachedCount, limit: standing.knownFormsLimit });

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">
          Друїд {standing.druidLevel}
        </Badge>
        {standing.isMoonCircle && (
          <Badge variant="outline" className="border-indigo-500/40 text-indigo-300">
            {subclassTranslations.CIRCLE_OF_THE_MOON}
          </Badge>
        )}
        {uses && (
          <Badge variant="outline" className="border-purple-500/40 text-purple-300">
            Використань {uses.remaining} / {uses.max}
          </Badge>
        )}
        {standing.knownFormsLimit !== null && (
          <Badge
            variant="outline"
            className={overflow ? "border-amber-500/50 text-amber-300" : "border-sky-500/40 text-sky-300"}
          >
            Відомі форми {attachedCount} / {standing.knownFormsLimit}
          </Badge>
        )}
        <span>{standing.limitNotes.join(" · ")}</span>
      </div>
      {overflow && <p className="text-xs text-amber-400/90">{overflow}</p>}
    </div>
  );
}

function AttachedFormList({
  forms,
  persId,
  isReadOnly,
  isPending,
  onChanged,
}: {
  forms: AttachedForm[];
  persId: number;
  isReadOnly?: boolean;
  isPending: boolean;
  onChanged: () => void;
}) {
  if (forms.length === 0) {
    return (
      <p className="text-sm text-slate-500 py-2">
        Форм ще не прикріплено. Додайте ті, якими користуєтесь за столом, — щоб не шукати їх у
        бестіарії посеред бою.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {forms.map((form) => (
        <FormRow
          key={form.wildshapeId}
          form={form}
          persId={persId}
          isReadOnly={isReadOnly}
          isPending={isPending}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}

function FormRow({
  form,
  persId,
  isReadOnly,
  isPending,
  onChanged,
}: {
  form: AttachedForm;
  persId: number;
  isReadOnly?: boolean;
  isPending: boolean;
  onChanged: () => void;
}) {
  const router = useRouter();

  // Перевтілення й витрата — одна дія, тож лист мусить оновити ще й лічильник на слайді Рис:
  // він приїжджає з сервера, а не зі стану Дикої форми.
  async function transform() {
    const result = await enterWildshapeForm({ persId, wildshapeId: form.wildshapeId });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    for (const warning of result.warnings) toast.warning(warning);
    onChanged();
    router.refresh();
  }

  async function detach() {
    const result = await detachWildshapeForm({ persId, wildshapeId: form.wildshapeId });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onChanged();
  }

  const blockingReasons = (form.eligibility?.reasons ?? []).filter((reason) => reason.blocking);
  const unavailable = !form.creature || blockingReasons.length > 0;

  return (
    <div className="flex items-center justify-between gap-2 p-3 rounded-lg border border-white/5 bg-slate-800/40">
      <div className="min-w-0">
        <div className="font-bold text-slate-50 truncate">
          {form.creature?.name ?? form.key}
        </div>
        <div className="text-xs text-slate-400 truncate">
          {form.creature
            ? `КР ${form.creature.challenge} · ${form.creature.hp} хітів · ${form.creature.speed}`
            : "Цієї істоти більше немає в каталозі"}
        </div>
        {blockingReasons.map((reason) => (
          <div key={reason.kind} className="text-xs text-amber-400/90">
            {reason.text}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {!isReadOnly && (
          <>
            <Button size="sm" disabled={isPending || !!unavailable} onClick={transform}>
              Перетворитися
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={isPending} onClick={detach}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
