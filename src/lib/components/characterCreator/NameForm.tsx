import { nameSchema } from "@/lib/zod/schemas/persCreateSchema";
import { useStepForm } from "@/hooks/useStepForm";
import { Input } from "@/lib/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card";
import { Badge } from "@/lib/components/ui/badge";
import { raceTranslations, classTranslations, backgroundTranslations } from "@/lib/refs/translation";
import { BackgroundI, ClassI, RaceI } from "@/lib/types/model-types";

interface Props {
  formId: string;
  race?: RaceI;
  selectedClass?: ClassI;
  background?: BackgroundI;
}

const SummaryCard = ({ label, value }: { label: string; value?: string }) => (
  <Card className="border border-slate-800/70 bg-slate-900/70 shadow-inner">
    <CardHeader className="pb-2">
      <CardDescription className="text-slate-400">{label}</CardDescription>
      <CardTitle className="text-white text-lg">{value ?? "Не обрано"}</CardTitle>
    </CardHeader>
  </Card>
);

export const NameForm = ({ formId, race, selectedClass, background }: Props) => {
  const { form, onSubmit } = useStepForm(nameSchema);

  const raceName = race ? raceTranslations[race.name] : undefined;
  const className = selectedClass ? classTranslations[selectedClass.name] : undefined;
  const bgName = background ? backgroundTranslations[background.name] : undefined;

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <Card className="border border-slate-800/70 bg-slate-950/70 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white">Ім'я персонажа</CardTitle>
          <CardDescription className="text-slate-400">
            Завершіть створення та перевірте вибір.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryCard label="Раса" value={raceName} />
            <SummaryCard label="Клас" value={className} />
            <SummaryCard label="Передісторія" value={bgName} />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-300" htmlFor="name">Ім'я</label>
            <Input
              id="name"
              placeholder="Наприклад, Аравор"
              {...form.register('name')}
              className="border-slate-800/80 bg-slate-900/70 text-white"
            />
            <p className="text-xs text-slate-500">Це ім'я побачите у підсумку та на листі персонажа.</p>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

export default NameForm;
