import {z, ZodObject, ZodRawShape} from "zod";
import { usePersFormStore } from "@/stores/persFormStore";
import { zodResolver } from "@hookform/resolvers/zod";
import {DefaultValues, useForm} from "react-hook-form";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

const extractErrorMessage = (err: unknown): string | null => {
    if (!err) return null;
    if (Array.isArray(err)) {
        for (const entry of err) {
            const msg = extractErrorMessage(entry);
            if (msg) return msg;
        }
    } else if (typeof err === "object") {
        if ("message" in (err as { message?: unknown }) && typeof (err as { message?: unknown }).message === "string") {
            return (err as { message: string }).message;
        }
        for (const value of Object.values(err as Record<string, unknown>)) {
            const msg = extractErrorMessage(value);
            if (msg) return msg;
        }
    }
    return null;
}

export function useStepForm<TShape extends ZodRawShape>(schema: ZodObject<TShape>) {
    type Input = z.input<typeof schema>
    type Output = z.output<typeof schema>

    const { formData, updateFormData, nextStep } = usePersFormStore();

    const schemaDefaults = useMemo(() => {
        const result = schema.safeParse({});
        return result.success ? result.data: {}
    }, [schema]);

    const relevantFormData = useMemo(() => {
        const schemaKeys = Object.keys(schema.shape);
        return Object.keys(formData)
          .filter(key => schemaKeys.includes(key)).reduce((acc, key) => {
              acc[key] = formData[key]
              return acc;
          }, {} as Record<string, any>)
    }, [formData, schema])

    const mergedDefaults = useMemo(() => ({
        ...schemaDefaults,
        ...relevantFormData,
    }), [schemaDefaults, formData])

    const form = useForm<Input, unknown, Output>({
        resolver: zodResolver(schema),
        defaultValues: mergedDefaults as DefaultValues<Input>,
        mode: "onChange",
        shouldUnregister: true
    });


    useEffect(() => {
        const subscription = form.watch((value) => {
            updateFormData(value as Partial<Input>);
        });
        return () => subscription.unsubscribe();
    }, [form.watch, updateFormData])

    const friendlyMessages: Record<string, string> = {
        raceId: "Оберіть, будь ласка, расу",
        classId: "Оберіть, будь ласка, клас",
        backgroundId: "Оберіть, будь ласка, передісторію",
        asi: "Перевірте характеристики",
        simpleAsi: "Перевірте характеристики",
        customAsi: "Введіть коректні значення",
        racialBonusChoiceSchema: "Додайте всі расові бонуси",
        basicChoices: "Оберіть потрібну кількість навичок",
        tashaChoices: "Оберіть потрібну кількість навичок",
        choiceGroupToId: "Оберіть спорядження",
        name: "Введіть ім'я персонажа",
    };

    const onSubmit = form.handleSubmit((data) => {
        updateFormData(data as unknown as Partial<Input>);
        nextStep();
    }, (errors) => {
        const firstMessage = extractErrorMessage(errors);
        const firstKey = Object.keys(errors)[0];
        const friendly = firstKey ? friendlyMessages[firstKey] : undefined;
        toast.error(friendly ?? 'Не вдалося зберегти крок', {
            description: friendly ? undefined : firstMessage ?? 'Перевірте введені поля.',
        });
        console.error('❌ Validation errors:', errors);
    });

    return { form, onSubmit };
}
