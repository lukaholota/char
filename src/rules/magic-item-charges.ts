export type MagicItemCharges = {
  chargesMax: number | null;
  chargesCurrent: number | null;
};

const NO_CHARGES: MagicItemCharges = { chargesMax: null, chargesCurrent: null };

export function applyChargesMax(charges: MagicItemCharges, chargesMax: number | null): MagicItemCharges {
  if (chargesMax === null || !Number.isInteger(chargesMax) || chargesMax <= 0) return NO_CHARGES;
  const chargesCurrent = charges.chargesCurrent ?? chargesMax;
  return { chargesMax, chargesCurrent: Math.min(chargesCurrent, chargesMax) };
}

export function applyChargesStep(charges: MagicItemCharges, step: number): MagicItemCharges {
  if (charges.chargesMax === null) return NO_CHARGES;
  const chargesCurrent = (charges.chargesCurrent ?? charges.chargesMax) + step;
  return { chargesMax: charges.chargesMax, chargesCurrent: Math.max(0, Math.min(chargesCurrent, charges.chargesMax)) };
}
