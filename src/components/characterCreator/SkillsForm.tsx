import {skillsSchema} from "@/zod/schemas/persCreateSchema";
import {useStepForm} from "@/hooks/useStepForm";
import clsx from "clsx";
import {classTranslations, classTranslationsEng} from "@/refs/translation";
import {BackgroundI, ClassI, RaceI, SkillProficiencies} from "@/types/model-types";

interface Props {
  race: RaceI
  selectedClass: ClassI
  background: BackgroundI
}

function getSkillProficienciesCount(skillProfs: SkillProficiencies | null): number {
  if (!skillProfs) return 0;

  if (Array.isArray(skillProfs)) return skillProfs.length

  return skillProfs.choiceCount
}

function getTotalSkillProficienciesCount(
  {raceCount, classCount, backgroundCount}: { raceCount: number, classCount: number, backgroundCount: number }
): number {
  return raceCount + classCount + backgroundCount
}

export const SkillsForm = ({race, selectedClass, background}: Props) => {
  const {form, onSubmit} = useStepForm(skillsSchema);

  const tashaChoices = form.watch('tashaChoices')
  const tashaChoiceCount = getTotalSkillProficienciesCount({
    raceCount: getSkillProficienciesCount(race.skillProficiencies),
    classCount: getSkillProficienciesCount(selectedClass.skillProficiencies),
    backgroundCount: getSkillProficienciesCount(background.skillProficiencies)
  })

  const basicChoices = form.watch('basicChoices')
  const isTasha = form.watch('isTasha')
  return (
    <form onSubmit={onSubmit}>
      <h2 className="my-5">Оберіть клас</h2>

      {form.formState.errors.basicChoices && (
        <p className="text-red-500 text-sm">
          {form.formState.errors.basicChoices.message}
        </p>
      )}

      {
        skills.map((entry, index) => (
          <label
            key={index}
            className={clsx(
              "p-3 border-[1px] cursor-pointer my-2 rounded-xl",
              c.classId === chosenClassId
                ? "bg-violet-700 border-slate-700"
                : "bg-violet-900 border-slate-800 hover:bg-violet-800"
            )}
            onClick={() => form.setValue('classId', c.classId)}
          >
            <div>{classTranslations[c.name]}</div>
            <div className="text-xs text-slate-400">
              {classTranslationsEng[c.name]}
            </div>
          </label>
        ))}

      <input type="hidden" {...form.register('classId', {valueAsNumber: true})} />

      <button type="submit" className="mt-4 px-6 py-2 bg-violet-600 rounded">
        Далі →
      </button>
    </form>
  )
};

}

export default SkillsForm
