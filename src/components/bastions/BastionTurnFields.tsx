"use client";

import { bastionFieldLabelClassName, bastionTextAreaClassName } from "@/components/bastions/bastion-field-styles";
import { Input } from "@/components/ui/input";

export function BastionTurnFields({
  turnNumber,
  entry,
  entryPlaceholder,
  onTurnNumberChange,
  onEntryChange,
}: {
  turnNumber: string;
  entry: string;
  entryPlaceholder?: string;
  onTurnNumberChange: (value: string) => void;
  onEntryChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
      <label className="block space-y-1">
        <span className={bastionFieldLabelClassName}>Хід №</span>
        <Input type="number" min={1} value={turnNumber} onChange={(event) => onTurnNumberChange(event.target.value)} />
      </label>
      <label className="block space-y-1">
        <span className={bastionFieldLabelClassName}>Що сталося</span>
        <textarea
          value={entry}
          onChange={(event) => onEntryChange(event.target.value)}
          className={bastionTextAreaClassName}
          placeholder={entryPlaceholder}
        />
      </label>
    </div>
  );
}
