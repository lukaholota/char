"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveHomebrewCreature } from "@/lib/actions/homebrew-actions";
import {
  ABILITY_FIELDS,
  CREATURE_PROSE_FIELDS,
  CREATURE_SIZES,
  CREATURE_TYPES,
} from "@/lib/logic/homebrew-input";
import type { HomebrewCreatureFormValues } from "@/lib/logic/homebrew-form-values";
import { ACCEPTED_IMAGE_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES } from "@/lib/media-upload-limits";
import { CHALLENGE_RATINGS } from "@/rules/challenge-rating";
import { ImageCropDialog } from "@/lib/components/portrait/ImageCropDialog";
import { RichTextField, RULESET_OPTIONS, SelectField, TextField } from "./HomebrewFormFields";
import { useHomebrewSubmit } from "./useHomebrewSubmit";

const ABILITY_LABELS: Record<(typeof ABILITY_FIELDS)[number], string> = { strength: "СИЛ", dexterity: "СПР", constitution: "СТА", intelligence: "ІНТ", wisdom: "МУД", charisma: "ХАР" };
const PROSE_LABELS: Record<(typeof CREATURE_PROSE_FIELDS)[number], string> = {
  specialAbilities: "Риси",
  actions: "Дії",
  bonusActions: "Бонусні дії",
  reactions: "Реакції",
  legendaryActions: "Легендарні дії",
  description: "Опис",
};
const DETAIL_FIELDS = [
  { name: "savingThrows", label: "Ряткидки", placeholder: "Спр +4, Муд +3" },
  { name: "skills", label: "Навички", placeholder: "Уважність +5" },
  { name: "damageVulnerability", label: "Вразливість до шкоди", placeholder: "" },
  { name: "damageResistance", label: "Опір шкоді", placeholder: "" },
  { name: "damageImmunity", label: "Імунітет до шкоди", placeholder: "" },
  { name: "conditionImmunity", label: "Імунітет до станів", placeholder: "" },
  { name: "senses", label: "Чуття", placeholder: "Темнозір 60 фт., пасивна Уважність 13" },
  { name: "languages", label: "Мови", placeholder: "—" },
] as const;

type Props = { entryId?: number; initialValues: HomebrewCreatureFormValues; initialImageUrl: string | null };

export function HomebrewCreatureForm({ entryId, initialValues, initialImageUrl }: Props) {
  const [values, setValues] = useState(initialValues);
  const [image, setImage] = useState<{ blob: Blob | null; previewUrl: string | null; isRemoved: boolean }>({ blob: null, previewUrl: initialImageUrl, isRemoved: false });
  const [imageError, setImageError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { errors, isSaving, submit } = useHomebrewSubmit();
  const set = (key: keyof HomebrewCreatureFormValues) => (value: string) => setValues((current) => ({ ...current, [key]: value }));

  const [croppingFile, setCroppingFile] = useState<File | null>(null);

  const acceptCroppedImage = (blob: Blob) => {
    setCroppingFile(null);
    if (blob.size > MAX_IMAGE_UPLOAD_BYTES) return setImageError("Картинка завелика навіть після стискання");
    setImageError(null);
    setImage({ blob, previewUrl: URL.createObjectURL(blob), isRemoved: false });
  };

  const rejectUnreadableImage = () => {
    setCroppingFile(null);
    setImageError("Не вдалося відкрити картинку. Спробуйте JPEG, PNG або WebP.");
  };

  const save = () => {
    const formData = new FormData();
    formData.set("values", JSON.stringify(values));
    if (entryId) formData.set("entryId", String(entryId));
    if (image.blob) formData.set("image", image.blob, "creature.webp");
    if (image.isRemoved) formData.set("removeImage", "1");
    return saveHomebrewCreature(formData);
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(save);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField name="name" label="Назва" value={values.name} onChange={set("name")} maxLength={120} error={errors.name} />
        <TextField name="engName" label="Назва англійською" value={values.engName} onChange={set("engName")} maxLength={120} hint="Необовʼязково" />
        <SelectField name="ruleset" label="Редакція" value={values.ruleset} onChange={set("ruleset")} options={RULESET_OPTIONS} />
        <SelectField name="size" label="Розмір" value={values.size} onChange={set("size")} options={CREATURE_SIZES.map((size) => ({ value: size, label: size }))} error={errors.size} />
        <TextField name="type" label="Тип" value={values.type} onChange={set("type")} maxLength={128} list="homebrew-creature-types" placeholder="Чудовисько" error={errors.type} />
        <TextField name="alignment" label="Світогляд" value={values.alignment} onChange={set("alignment")} maxLength={64} placeholder="Хаотично-злий" />
        <TextField name="ac" label="Клас броні" value={values.ac} onChange={set("ac")} maxLength={64} placeholder="15 (природний)" error={errors.ac} />
        <TextField name="hp" label="Хіти" value={values.hp} onChange={set("hp")} maxLength={64} placeholder="45 (6к10 + 12)" error={errors.hp} />
        <TextField name="speed" label="Швидкість" value={values.speed} onChange={set("speed")} maxLength={120} placeholder="30 фт., політ 60 фт." error={errors.speed} />
        <SelectField name="challenge" label="Показник небезпеки" value={values.challenge} onChange={set("challenge")} options={CHALLENGE_RATINGS.map((rating) => ({ value: rating, label: rating }))} error={errors.challenge} />
      </div>
      <datalist id="homebrew-creature-types">
        {CREATURE_TYPES.map((type) => (
          <option key={type} value={type} />
        ))}
      </datalist>

      <fieldset className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Характеристики</legend>
        {ABILITY_FIELDS.map((field) => (
          <label key={field} className="space-y-1 text-center" htmlFor={`homebrew-${field}`}>
            <span className="text-xs font-bold text-slate-400">{ABILITY_LABELS[field]}</span>
            <input id={`homebrew-${field}`} type="number" inputMode="numeric" value={values[field]} onChange={(event) => set(field)(event.target.value)} className="h-11 w-full rounded-lg border border-white/10 bg-slate-950/50 text-center text-base text-slate-100 outline-none focus:ring-1 focus:ring-amber-400/40" />
            {errors[field] ? <span className="block text-xs text-rose-300">{errors[field]}</span> : null}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        {DETAIL_FIELDS.map((field) => (
          <TextField key={field.name} name={field.name} label={field.label} value={values[field.name]} onChange={set(field.name)} maxLength={300} placeholder={field.placeholder} error={errors[field.name]} />
        ))}
      </div>

      {CREATURE_PROSE_FIELDS.map((field) => (
        <RichTextField key={field} name={field} label={PROSE_LABELS[field]} value={values[field]} onChange={set(field)} isTall={field === "actions"} error={errors[field]} placeholder={field === "actions" ? "Укус. Рукопашна атака: +5 на влучання, досяжність 5 фт. Влучання: 8 (1к10 + 3) колючої шкоди." : undefined} />
      ))}

      <section className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Картинка</span>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {image.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- попередній перегляд локального файлу або вже стиснутого WebP із R2
            <img src={image.previewUrl} alt="Картинка істоти" className="h-32 w-32 rounded-xl border border-white/10 object-cover" />
          ) : null}
          <input ref={inputRef} type="file" accept={ACCEPTED_IMAGE_MIME_TYPES} className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) setCroppingFile(file); }} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" className="h-11 gap-2 sm:h-9" onClick={() => inputRef.current?.click()}>
              <ImagePlus className="h-4 w-4" />
              {image.previewUrl ? "Замінити" : "Додати картинку"}
            </Button>
            {image.previewUrl ? (
              <Button type="button" variant="secondary" className="h-11 gap-2 sm:h-9" onClick={() => setImage({ blob: null, previewUrl: null, isRemoved: true })}>
                <Trash2 className="h-4 w-4" />
                Прибрати
              </Button>
            ) : null}
          </div>
        </div>
        <ImageCropDialog file={croppingFile} title="Кадр картинки істоти" onCancel={() => setCroppingFile(null)} onCropped={acceptCroppedImage} onUnreadable={rejectUnreadableImage} />
        {imageError ? <p className="text-xs text-rose-300">{imageError}</p> : <p className="text-xs text-slate-500">Кадрування й стиснення автоматичні. Лише власні або вільні для використання зображення.</p>}
      </section>

      <Button type="submit" className="h-12 w-full sm:h-10 sm:w-auto" disabled={isSaving}>
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : entryId ? "Зберегти зміни" : "Опублікувати"}
      </Button>
    </form>
  );
}
