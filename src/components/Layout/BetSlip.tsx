import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Layers, Ticket, Trash2, X } from 'lucide-react';
import type { BetSelection, OddsFormat } from '../../types';
import { formatCurrency, formatOdds } from '../../utils/oddsFormatter';

interface BetSlipProps {
  pending: BetSelection[];
  removeSelection: (id: string) => void;
  updateWager: (id: string, amount: number) => void;
  parlayMode: boolean;
  toggleParlay: () => void;
  parlayWager: number;
  setParlayWager: (n: number) => void;
  parlayDecimalOdds: number;
  parlayAmericanOdds: number;
  totalStake: number;
  balance: number;
  format: OddsFormat;
  onPlace: () => void;
  onClose?: () => void; // mobile drawer close
}

function parseWager(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

export function BetSlip({
  pending,
  removeSelection,
  updateWager,
  parlayMode,
  toggleParlay,
  parlayWager,
  setParlayWager,
  parlayDecimalOdds,
  parlayAmericanOdds,
  totalStake,
  balance,
  format,
  onPlace,
  onClose,
}: BetSlipProps) {
  const [confirming, setConfirming] = useState(false);
  const flashRef = useRef<HTMLDivElement>(null);

  const isParlay = parlayMode && pending.length >= 2;
  const everyWagerValid = pending.every((s) => s.wager >= 1);
  const overBalance = totalStake > balance + 1e-9;

  let disabledReason: string | null = null;
  if (pending.length === 0) disabledReason = 'Select odds to build your slip';
  else if (parlayMode && pending.length < 2) disabledReason = 'Add 2+ selections for a parlay';
  else if (isParlay && parlayWager < 1) disabledReason = 'Enter a parlay stake';
  else if (!isParlay && !everyWagerValid) disabledReason = 'Each wager must be at least $1';
  else if (overBalance) disabledReason = 'Stake exceeds balance';

  const canPlace = disabledReason === null;

  const potentialReturn = isParlay
    ? parlayWager * parlayDecimalOdds
    : pending.reduce((sum, s) => sum + s.wager * s.decimalOdds, 0);

  // Clear the transient "Bets Placed!" confirmation after a moment.
  useEffect(() => {
    if (!confirming) return;
    const t = window.setTimeout(() => setConfirming(false), 1800);
    return () => window.clearTimeout(t);
  }, [confirming]);

  const handlePlace = () => {
    if (!canPlace) return;
    onPlace();
    setConfirming(true);
    flashRef.current?.classList.remove('place-flash');
    // reflow to restart the animation
    void flashRef.current?.offsetWidth;
    flashRef.current?.classList.add('place-flash');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, id?: string) => {
    if (e.key === 'Escape') {
      if (id) updateWager(id, 0);
      else setParlayWager(0);
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <aside
      ref={flashRef}
      className="surface flex flex-col"
      style={{ height: '100%', overflow: 'hidden' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <Ticket size={18} className="text-lime" />
          <span className="uppercase-head" style={{ fontWeight: 700, fontSize: '1rem' }}>
            Bet Slip
          </span>
          {pending.length > 0 && (
            <span className="nav-count tabular" style={{ marginLeft: 2 }}>
              {pending.length}
            </span>
          )}
        </div>
        {onClose && (
          <button type="button" className="btn btn-ghost" style={{ padding: 6 }} onClick={onClose} aria-label="Close bet slip">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Parlay toggle */}
      {pending.length > 0 && (
        <button
          type="button"
          className="flex items-center justify-between"
          style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}
          onClick={toggleParlay}
          aria-pressed={parlayMode}
        >
          <span className="flex items-center gap-2 text-muted">
            <Layers size={15} />
            <span className="uppercase-head" style={{ fontSize: '0.8rem' }}>
              Parlay
            </span>
          </span>
          <span className={`toggle ${parlayMode ? 'is-on' : ''}`} aria-hidden />
        </button>
      )}

      {/* Selections */}
      <div className="scroll-area" style={{ flex: 1, padding: pending.length ? 12 : 0 }}>
        {pending.length === 0 ? (
          <div className="state-panel" style={{ border: 'none', padding: 40 }}>
            <span className="state-icon">
              <Ticket size={22} />
            </span>
            <div className="text-muted" style={{ fontSize: '0.9rem', maxWidth: 220 }}>
              Select odds from any live match to build your slip.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map((s) => (
              <div key={s.id} className="surface" style={{ background: 'var(--surface-raised)', padding: 10 }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-faint" style={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.gameLabel}
                    </div>
                    <div className="font-head" style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                      {s.selectionLabel}
                    </div>
                  </div>
                  <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                    <span className="font-head tabular text-lime" style={{ fontWeight: 700 }}>
                      {formatOdds(s.americanOdds, s.decimalOdds, format)}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: 4 }}
                      onClick={() => removeSelection(s.id)}
                      aria-label={`Remove ${s.selectionLabel}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {!parlayMode && (
                  <div className="flex items-center justify-between gap-2" style={{ marginTop: 8 }}>
                    <div className="flex items-center gap-1" style={{ maxWidth: 130 }}>
                      <span className="text-faint" style={{ fontSize: '0.85rem' }}>$</span>
                      <input
                        type="number"
                        className="input"
                        style={{ padding: '5px 8px', fontSize: '0.9rem' }}
                        min={1}
                        max={balance}
                        value={s.wager || ''}
                        placeholder="0"
                        onChange={(e) => updateWager(s.id, parseWager(e.target.value))}
                        onKeyDown={(e) => handleKeyDown(e, s.id)}
                        aria-label={`Wager for ${s.selectionLabel}`}
                      />
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                      Payout{' '}
                      <span className="text-lime tabular font-head" style={{ fontWeight: 600 }}>
                        {formatCurrency(s.wager * s.decimalOdds)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer / summary */}
      {pending.length > 0 && (
        <div style={{ padding: 14, borderTop: '1px solid var(--border)' }}>
          {isParlay && (
            <div className="surface" style={{ background: 'var(--surface-raised)', padding: 10, marginBottom: 10 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <span className="text-muted uppercase-head" style={{ fontSize: '0.74rem' }}>
                  {pending.length}-Leg Parlay
                </span>
                <span className="font-head tabular text-lime" style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  {formatOdds(parlayAmericanOdds, parlayDecimalOdds, format)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-faint" style={{ fontSize: '0.85rem' }}>$</span>
                <input
                  type="number"
                  className="input"
                  style={{ padding: '6px 8px' }}
                  min={1}
                  max={balance}
                  value={parlayWager || ''}
                  placeholder="0"
                  onChange={(e) => setParlayWager(parseWager(e.target.value))}
                  onKeyDown={(e) => handleKeyDown(e)}
                  aria-label="Parlay stake"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>Total Stake</span>
            <span className="font-head tabular" style={{ fontWeight: 600 }}>
              {formatCurrency(totalStake)}
            </span>
          </div>
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>Potential Return</span>
            <span className="font-head tabular text-lime" style={{ fontWeight: 700, fontSize: '1.15rem' }}>
              {formatCurrency(potentialReturn)}
            </span>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px' }}
            disabled={!canPlace}
            onClick={handlePlace}
          >
            {confirming ? 'Bets Placed!' : 'Place Bets'}
          </button>
          {disabledReason && (
            <div className="text-faint" style={{ fontSize: '0.74rem', textAlign: 'center', marginTop: 8 }}>
              {disabledReason}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
