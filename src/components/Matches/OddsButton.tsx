import { useEffect, useRef, useState } from 'react';
import type { OddsFormat } from '../../types';
import { formatOdds } from '../../utils/oddsFormatter';

interface OddsButtonProps {
  label: string;
  american: number;
  decimal: number;
  format: OddsFormat;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Odds button with all interaction states. On a poll-driven odds change it
 * flashes green if the line improved for the bettor (higher decimal payout)
 * or red if it worsened, for 800ms.
 */
export function OddsButton({
  label,
  american,
  decimal,
  format,
  active,
  onClick,
  disabled,
}: OddsButtonProps) {
  const prevDecimal = useRef(decimal);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (decimal !== prevDecimal.current) {
      setFlash(decimal > prevDecimal.current ? 'up' : 'down');
      prevDecimal.current = decimal;
      const t = window.setTimeout(() => setFlash(null), 800);
      return () => window.clearTimeout(t);
    }
  }, [decimal]);

  return (
    <button
      type="button"
      className={`odds-btn ${active ? 'is-active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={label}
    >
      <span className="odds-label">{label}</span>
      <span
        className={`odds-value ${flash === 'up' ? 'flash-up' : ''} ${flash === 'down' ? 'flash-down' : ''}`}
      >
        {formatOdds(american, decimal, format)}
      </span>
    </button>
  );
}
