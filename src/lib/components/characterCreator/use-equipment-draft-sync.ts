import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { equipmentSchema } from "@/lib/zod/schemas/persCreateSchema";

type EquipmentForm = UseFormReturn<z.input<typeof equipmentSchema>, unknown, z.output<typeof equipmentSchema>>;

/** A preset edits equipment without the step's submit, so each change goes straight to the draft. */
export function useEquipmentDraftSync(form: EquipmentForm, isEnabled: boolean) {
  const updateFormData = usePersFormStore((state) => state.updateFormData);

  useEffect(() => {
    if (!isEnabled) return;
    const subscription = form.watch(() => {
      const selection = form.getValues();
      updateFormData({ equipmentSchema: { ...selection, choiceGroupToId: selection.choiceGroupToId ?? {}, anyWeaponSelection: selection.anyWeaponSelection ?? {} } });
    });
    return () => subscription.unsubscribe();
  }, [isEnabled, form, updateFormData]);
}
