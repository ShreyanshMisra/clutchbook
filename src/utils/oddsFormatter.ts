import type { OddsFormat } from '../types';

/** Format American odds with an explicit + sign for favorites' underdogs. */
export function formatAmerican(american: number): string {
  return american > 0 ? `+${american}` : `${american}`;
}

/** Format decimal odds to 2 dp. */
export function formatDecimal(decimal: number): string {
  return decimal.toFixed(2);
}

/** Format a single odds value according to the user's chosen display format. */
export function formatOdds(
  american: number,
  decimal: number,
  format: OddsFormat,
): string {
  return format === 'american' ? formatAmerican(american) : formatDecimal(decimal);
}

/** Convert decimal odds back to American (used for parlay combined odds). */
export function decimalToAmerican(decimal: number): number {
  if (decimal <= 1) return 0;
  if (decimal >= 2) {
    return Math.round((decimal - 1) * 100);
  }
  return Math.round(-100 / (decimal - 1));
}

/** Product of decimal odds = combined parlay decimal odds. */
export function parlayDecimal(decimals: number[]): number {
  if (decimals.length === 0) return 0;
  return decimals.reduce((acc, d) => acc * d, 1);
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

/** Potential total return (stake included) for a wager at decimal odds. */
export function potentialPayout(wager: number, decimalOdds: number): number {
  return wager * decimalOdds;
}

/** Net profit (return minus stake). */
export function netProfit(wager: number, decimalOdds: number): number {
  return wager * decimalOdds - wager;
}
