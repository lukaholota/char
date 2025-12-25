"use client";

import { useState, useEffect } from "react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/lib/components/ui/card";
// import { Button } from "@/lib/components/ui/Button";
import { Badge } from "@/lib/components/ui/badge";
import { Label } from "@/lib/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/lib/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import FeatsForm from "@/lib/components/characterCreator/FeatsForm";
import { Feat } from "@prisma/client";
import { Ability } from "@prisma/client";

interface Props {
  feats: Feat[];
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

const ABILITIES = Object.values(Ability);

export default function LevelUpASIForm({ feats, onNextDisabledChange }: Props) {
  const { updateFormData, formData } = usePersFormStore();
  const [choiceType, setChoiceType] = useState<"ASI" | "FEAT">("ASI");
  
  // ASI State
  const [asiSelection, setAsiSelection] = useState<{ ability: string; value: number }[]>([]);
  
  // Sync with store
  useEffect(() => {
      if (choiceType === "ASI") {
          // Clear feat
          updateFormData({ featId: undefined });
          
          // Update customAsi
          // We use customAsi to store the bonuses: [{ability: 'STR', value: '2'}]
          const formatted = asiSelection.map(s => ({ ability: s.ability, value: s.value.toString() }));
          // Fill to 6 items to satisfy schema if needed, or just pass what we have if schema allows optional
          // The schema expects 6 items for CUSTOM system.
          // We might need to bypass the schema validation for Level Up or mock the rest.
          // Actually, for Level Up we don't use the full creation schema validation.
          // We will validate manually in the action.
          updateFormData({ customAsi: formatted as any });
          
          const total = asiSelection.reduce((acc, s) => acc + s.value, 0);
          const isValid = total === 2 && asiSelection.length > 0;
          onNextDisabledChange?.(!isValid);
      } else {
          // Clear ASI
          updateFormData({ customAsi: [] });
          // Feat validation is handled by FeatsForm? 
          // FeatsForm uses useStepForm which validates featId.
          // But here we are wrapping it.
          // We need to check if featId is set.
          const isValid = !!formData.featId;
          onNextDisabledChange?.(!isValid);
      }
  }, [choiceType, asiSelection, formData.featId, updateFormData, onNextDisabledChange]);

  const handleAsiChange = (index: number, ability: string) => {
      const newSel = [...asiSelection];
      if (!newSel[index]) newSel[index] = { ability, value: 1 };
      else newSel[index].ability = ability;
      setAsiSelection(newSel);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Оберіть покращення</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={choiceType} 
            onValueChange={(v) => setChoiceType(v as "ASI" | "FEAT")}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ASI" id="asi" />
              <Label htmlFor="asi">Покращення характеристик (+2)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="FEAT" id="feat" />
              <Label htmlFor="feat">Риса (Feat)</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {choiceType === "ASI" && (
        <Card>
            <CardHeader>
                <CardTitle>Розподіл характеристик</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-4 items-center">
                    <Label>Варіант:</Label>
                    <Select 
                        value={asiSelection.length === 1 && asiSelection[0].value === 2 ? "single" : "split"}
                        onValueChange={(v) => {
                            if (v === "single") setAsiSelection([{ ability: ABILITIES[0], value: 2 }]);
                            else setAsiSelection([{ ability: ABILITIES[0], value: 1 }, { ability: ABILITIES[1], value: 1 }]);
                        }}
                    >
                        <SelectTrigger className="w-[200px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="single">+2 до однієї</SelectItem>
                            <SelectItem value="split">+1 до двох</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {asiSelection.map((sel, idx) => (
                    <div key={idx} className="flex gap-4 items-center">
                        <Label>Характеристика {idx + 1}</Label>
                        <Select 
                            value={sel.ability} 
                            onValueChange={(v) => handleAsiChange(idx, v)}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ABILITIES.map(a => (
                                    <SelectItem key={a} value={a}>{a}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Badge>+{sel.value}</Badge>
                    </div>
                ))}
            </CardContent>
        </Card>
      )}

      {choiceType === "FEAT" && (
          <FeatsForm feats={feats} formId="feat-form-internal" />
      )}
    </div>
  );
}
