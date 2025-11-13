import {z, ZodObject, ZodRawShape} from "zod";
import { usePersFormStore } from "@/stores/persFormStore";
import { zodResolver } from "@hookform/resolvers/zod";
import {DefaultValues, useForm} from "react-hook-form";
import { useEffect, useMemo } from "react";

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
          .filter(key => schemaKeys.includes(key))
    })

    const mergedDefaults = useMemo(() => ({
        ...schemaDefaults,
        ...formData,
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

    const onSubmit = form.handleSubmit((data) => {
        updateFormData(data as unknown as Partial<Input>);
        nextStep();
    }, (errors) => console.error('❌ Validation errors:', errors));

    return { form, onSubmit };
};
