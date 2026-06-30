import { useEffect, useState } from 'react';
import { Hourglass } from 'lucide-react';
import type { Contract } from '../../types';
import { ActiveContractCard } from '../Contracts/ActiveContractCard';
import { PageHeader } from '../Layout/PageHeader';
import { EmptyState } from '../UI/EmptyState';

interface ActiveContractsProps {
  active: Contract[];
  username: string | null;
}

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: 14,
};

export function ActiveContracts({ active, username }: ActiveContractsProps) {
  // Tick so window countdowns stay live without a full refetch.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div>
      <PageHeader title="Active Matches" subtitle="These settle automatically against your verified results." />

      {active.length === 0 ? (
        <EmptyState icon={Hourglass} message="No active matches. Create one from Head-to-Head." />
      ) : (
        <div style={GRID}>
          {active.map((c) => (
            <ActiveContractCard key={c.id} contract={c} now={now} username={username} />
          ))}
        </div>
      )}
    </div>
  );
}
