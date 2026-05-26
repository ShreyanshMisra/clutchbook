import { useMemo, useState } from 'react';
import type { BetSelection } from '../../types';
import { formatCurrency } from '../../utils/oddsFormatter';

interface LeaderboardProps {
  placed: BetSelection[];
}

interface Player {
  name: string;
  bets: number;
  winRate: number; // 0..1
  profit: number;
  isYou?: boolean;
}

const HANDLES = [
  'n0scope_neo', 'GambitGremlin', 'rookrusher', 'TiltLord', 'ZugzwangZoe',
  'flagfall_fin', 'BlunderBoss', 'enpassant_eva', 'CheckmateCarl', 'pawnstorm_pia',
  'SicilianSiren', 'knightmare_ng', 'TempoTycoon', 'fortress_fox', 'GreekGiftGus',
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function seedFakePlayers(): Player[] {
  const rnd = seededRandom(73);
  const names = [...HANDLES].sort(() => rnd() - 0.5).slice(0, 10);
  return names.map((name) => {
    const bets = 8 + Math.floor(rnd() * 140);
    const winRate = 0.32 + rnd() * 0.36;
    const profit = Math.round((rnd() * 2600 - 700) / 5) * 5;
    return { name, bets, winRate, profit };
  });
}

function computeYou(placed: BetSelection[]): Player {
  const settled = placed.filter((b) => b.status !== 'pending');
  const wins = settled.filter((b) => b.status === 'won').length;
  const profit = settled.reduce((sum, b) => {
    if (b.status === 'won') return sum + (b.wager * b.decimalOdds - b.wager);
    return sum - b.wager;
  }, 0);
  return {
    name: 'You',
    bets: placed.length,
    winRate: settled.length > 0 ? wins / settled.length : 0,
    profit: Math.round(profit * 100) / 100,
    isYou: true,
  };
}

export function Leaderboard({ placed }: LeaderboardProps) {
  // Seed the fictional field once; it stays stable across re-renders.
  const [fakes] = useState<Player[]>(seedFakePlayers);
  const you = computeYou(placed);

  const ranked = useMemo(
    () => [...fakes, you].sort((a, b) => b.profit - a.profit),
    [fakes, you],
  );

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 16 }}>
        <h2 className="section-title" style={{ fontSize: '1.4rem' }}>Leaderboard</h2>
        <p className="text-muted" style={{ fontSize: '0.86rem' }}>
          Ranked by total profit. {you.bets === 0 && 'You haven’t placed any bets yet.'}
        </p>
      </div>

      <div className="surface scroll-area">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 64 }}>Rank</th>
              <th>Player</th>
              <th>Bets</th>
              <th>Win Rate</th>
              <th>Profit</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p, i) => {
              const rank = i + 1;
              const medal = rank <= 3 ? `rank-${rank}` : '';
              return (
                <tr key={p.name} className={p.isYou ? 'row-you' : ''}>
                  <td>
                    <span className={`rank-medal num ${medal}`}>
                      {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
                    </span>
                  </td>
                  <td>
                    <span className="font-head" style={{ fontWeight: 600 }}>
                      {p.name}
                    </span>
                    {p.isYou && <span className="badge" style={{ marginLeft: 8, color: 'var(--lime)', borderColor: 'rgba(190,255,0,0.4)' }}>You</span>}
                  </td>
                  <td className="num">{p.bets}</td>
                  <td className="num">{(p.winRate * 100).toFixed(0)}%</td>
                  <td
                    className="num"
                    style={{ color: p.profit >= 0 ? 'var(--lime)' : 'var(--crimson)', fontWeight: 600 }}
                  >
                    {p.profit >= 0 ? '+' : ''}
                    {formatCurrency(p.profit)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
