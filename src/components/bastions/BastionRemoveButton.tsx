"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTwoStepConfirm } from "@/hooks/useTwoStepConfirm";

export function BastionRemoveButton({
  label,
  confirmLabel,
  isPending,
  isIconOnly = false,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  isPending: boolean;
  isIconOnly?: boolean;
  onConfirm: () => void;
}) {
  const { ref, isConfirming, onClick } = useTwoStepConfirm<HTMLButtonElement>({ onConfirm });
  const isLabelHidden = isIconOnly && !isConfirming;

  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={isPending}
      aria-label={isLabelHidden ? label : undefined}
      className="gap-2 text-red-300"
    >
      <Trash2 className="h-4 w-4" />
      {isLabelHidden ? null : isConfirming ? confirmLabel : label}
    </Button>
  );
}
