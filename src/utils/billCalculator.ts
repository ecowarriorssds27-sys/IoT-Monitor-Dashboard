import { EBTariffSlab } from '../lib/supabase';

export function calculateBill(totalUnits: number, tariffSlabs: EBTariffSlab[]): number {
  let remainingUnits = totalUnits;
  let totalCost = 0;

  const sortedSlabs = [...tariffSlabs].sort((a, b) => a.slab_order - b.slab_order);

  for (const slab of sortedSlabs) {
    if (remainingUnits <= 0) break;

    const slabMin = slab.min_units;
    const slabMax = slab.max_units;
    const rate = slab.rate_per_unit;

    if (slabMax === null) {
      totalCost += remainingUnits * rate;
      remainingUnits = 0;
    } else {
      const unitsInThisSlab = Math.min(remainingUnits, slabMax - slabMin + 1);
      totalCost += unitsInThisSlab * rate;
      remainingUnits -= unitsInThisSlab;
    }
  }

  return totalCost;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatUnits(units: number): string {
  return units.toFixed(2) + ' kWh';
}
