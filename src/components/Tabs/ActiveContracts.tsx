import { useEffect, useState } from 'react';
import { Hourglass } from 'lucide-react';
import type { Contract } from '../../types';
import { ActiveContractCard } from '../Contracts/ActiveContractCard';

interface ActiveContractsProps {
  active: Contract[];
}

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: 14,
};

export function ActiveContracts({ active }: ActiveContractsProps) {
  // Tick so window countdowns stay live without a full refetch.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 16 }}>
        <h2 className="section-title">Active Matches</h2>
        <p className="text-faint" style={{ fontSize: '0.82rem', marginTop: 2 }}>
          Play your games — these settle automatically against your verified results.
        </p>
      </div>

      {active.length === 0 ? (
        <div className="state-panel">
          <div className="state-icon"><Hourglass size={22} /></div>
          <span className="text-muted">No active matches. Join or post one from the Lobby.</span>
        </div>
      ) : (
        <div style={GRID}>
          {active.map((c) => (
            <ActiveContractCard key={c.id} contract={c} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}
