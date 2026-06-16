import { useState } from 'react';
import { Info, Zap } from 'lucide-react';
import type { Contract, OddsFormat } from '../../types';
import { Badge } from '../UI/Badge';
import { formatCurrency, formatLine, formatPct, formatMultiplier } from '../../utils/oddsFormatter';
import { objectiveDetail, windowLabel } from '../../utils/contractText';

interface ContractCardProps {
  contract: Contract;
  format: OddsFormat;
  canActivate: (stake: number) => boolean;
  onActivate: (contract: Contract, stake: number) => void;
}

const MIN_STAKE = 1;
const MAX_STAKE = 100; // overview §7.3 per-contract cap

export function ContractCard({ contract, format, canActivate, onActivate }: ContractCardProps) {
  const [stake, setStake] = useState(contract.stake || 10);
  const { line } = contract;
  const payout = stake * line.decimal;
  const allowed = canActivate(stake) && stake >= MIN_STAKE && stake <= MAX_STAKE;

  return (
    <div className="surface-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={contract.speed}>{contract.speed}</Badge>
          <span className="text-faint uppercase-head" style={{ fontSize: '0.66rem' }}>
            {windowLabel(contract.window_hours)} window
          </span>
        </div>
        <div className="font-head" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--lime)', lineHeight: 1 }}>
          {formatLine(line.american, line.decimal, format)}
        </div>
      </div>

      {/* Objective */}
      <div>
        <h3 className="font-head" style={{ fontSize: '1.15rem', fontWeight: 600, lineHeight: 1.15 }}>
          {contract.title}
        </h3>
        <p className="text-muted" style={{ fontSize: '0.84rem', marginTop: 4, lineHeight: 1.4 }}>
          {objectiveDetail(contract.objective)}
        </p>
      </div>

      {/* Fair-odds / house-edge disclosure (required on every card) */}
      <div
        className="flex items-center gap-2 text-faint"
        style={{ fontSize: '0.72rem', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '8px 0' }}
      >
        <Info size={13} style={{ flexShrink: 0 }} />
        <span>
          Fair {formatMultiplier(line.fair_decimal)} · ~{formatPct(line.fair_prob)} to hit ·{' '}
          <span className="text-muted">{line.house_edge_pct}% house edge</span>
        </span>
      </div>

      {/* Stake + payout */}
      <div className="flex items-end gap-3">
        <label style={{ flex: 1 }}>
          <span className="text-faint uppercase-head" style={{ fontSize: '0.62rem', display: 'block', marginBottom: 4 }}>
            Stake
          </span>
          <input
            type="number"
            className="input"
            value={stake}
            min={MIN_STAKE}
            max={MAX_STAKE}
            onChange={(e) => setStake(Math.max(0, Number(e.target.value)))}
          />
        </label>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <span className="text-faint uppercase-head" style={{ fontSize: '0.62rem', display: 'block', marginBottom: 4 }}>
            Pays
          </span>
          <span className="font-head tabular" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            {formatCurrency(payout)}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        disabled={!allowed}
        style={{ width: '100%', justifyContent: 'center', gap: 8, padding: '11px' }}
        onClick={() => onActivate(contract, stake)}
      >
        <Zap size={16} /> Activate contract
      </button>
    </div>
  );
}
