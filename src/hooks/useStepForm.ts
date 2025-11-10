// hooks/useStepForm.ts
import { z } from "zod";
import { usePersFormStore } from "@/stores/persFormStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {useEffect} from "react";

// 🔥 БЕЗ ГЕНЕРІКІВ - найчистіше рішення
export const useStepForm = (schema: z.ZodObject) => {
    const { formData, updateFormData, nextStep } = usePersFormStore();

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: formData,
        mode: "onChange" as const,
    });

    useEffect(() => {
        const subscription = form.watch((value) => {
            updateFormData(value);
        });
        return () => subscription.unsubscribe();
    }, [form.watch, updateFormData])

    const onSubmit = form.handleSubmit((data) => {
        updateFormData(data);
        nextStep();
    });

    return { form, onSubmit };
};
