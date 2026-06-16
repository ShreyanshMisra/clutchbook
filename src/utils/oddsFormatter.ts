import type { OddsFormat } from '../types';

/** Format American odds with an explicit + sign for plus-money lines. */
export function formatAmerican(american: number): string {
  return american > 0 ? `+${american}` : `${american}`;
}

/** The contract multiplier, e.g. 1.85 -> "1.85×". */
export function formatMultiplier(decimal: number): string {
  return `${decimal.toFixed(2)}×`;
}

/** Show a line in the user's chosen format (multiplier or American). */
export function formatLine(
  american: number,
  decimal: number,
  format: OddsFormat,
): string {
  return format === 'american' ? formatAmerican(american) : formatMultiplier(decimal);
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
  return currency.format(amount);
}

/** Potential total return (stake included) for a stake at a given multiplier. */
export function potentialPayout(stake: number, decimal: number): number {
  return stake * decimal;
}

/** Net profit (return minus stake). */
export function netProfit(stake: number, decimal: number): number {
  return stake * decimal - stake;
}

/** Format a probability (0..1) as a whole-number percentage. */
export function formatPct(prob: number): string {
  return `${Math.round(prob * 100)}%`;
}
