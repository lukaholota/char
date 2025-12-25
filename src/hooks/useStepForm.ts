import {z, ZodObject, ZodRawShape} from "zod";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { zodResolver } from "@hookform/resolvers/zod";
import {DefaultValues, useForm} from "react-hook-form";
import { useEffect, useMemo, useRef } from "react";
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

export function useStepForm<TShape extends ZodRawShape>(
    schema: ZodObject<TShape>,
    onSuccess?: (data: z.output<typeof schema>) => void
) {
    type Input = z.input<typeof schema>
    type Output = z.output<typeof schema>

    const { formData, updateFormData, nextStep, isHydrated } = usePersFormStore();

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
    }), [schemaDefaults, relevantFormData])

    const form = useForm<Input, unknown, Output>({
        resolver: zodResolver(schema),
        defaultValues: mergedDefaults as DefaultValues<Input>,
        mode: "onChange",
        shouldUnregister: false
    });

    const didApplyHydratedDefaults = useRef(false);

    useEffect(() => {
        if (!isHydrated) return;
        if (didApplyHydratedDefaults.current) return;
        // After zustand-persist hydration, ensure persisted values override schema defaults.
        form.reset(mergedDefaults as DefaultValues<Input>);
        didApplyHydratedDefaults.current = true;
    }, [isHydrated, form, mergedDefaults]);

    // Save data when unmounting (navigating away without submitting)
    useEffect(() => {
        return () => {
            if (!isHydrated) return;
            const values = form.getValues();
            updateFormData(values);
        };
    }, [form, updateFormData, isHydrated]);


    useEffect(() => {
        if (!isHydrated) return;
        const subscription = form.watch((value) => {
            updateFormData(value as Partial<Input>);
        });
        return () => subscription.unsubscribe();
    }, [form, updateFormData, isHydrated])

    const friendlyMessages: Record<string, string> = {
        raceId: "Оберіть, будь ласка, расу",
        classId: "Оберіть, будь ласка, клас",
        backgroundId: "Оберіть, будь ласка, передісторію",
        classChoiceSelections: "Зробіть вибір серед опцій класу",
        classOptionalFeatureSelections: "Вкажіть, чи берете додаткову рису класу",
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
        if (onSuccess) {
            onSuccess(data as unknown as Output);
        } else {
            nextStep();
        }
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
