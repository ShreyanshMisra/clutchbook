import type { CSSProperties, ReactNode } from 'react';
import { Gamepad2, Info } from 'lucide-react';
import { gameById } from '../../utils/games';
import { formatCurrency } from '../../utils/format';
import { RecommendationDot } from './RecommendationDot';
import type { Recommendation } from '../../utils/recommend';

/** The shared shell for contest / pool / tournament cards: consistent padding,
 *  stacking, a subtle hover lift, and an optional AI recommendation dot. */
export function GameCard({
  children,
  style,
  recommendation,
}: {
  children: ReactNode;
  style?: CSSProperties;
  recommendation?: Recommendation;
}) {
  return (
    <div className="surface-card entity-card" style={style}>
      {children}
      {recommendation && <RecommendationDot rec={recommendation} />}
    </div>
  );
}

/** The small gradient icon tile for a game, reused in card headers. */
export function GameTile({ gameId, size = 30 }: { gameId: string; size?: number }) {
  const g = gameById(gameId);
  const Icon = g?.icon ?? Gamepad2;
  return (
    <span
      className="game-tile"
      style={{ background: g?.gradient, width: size, height: size, borderRadius: Math.round(size / 4.3) }}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={2.2} color="#0a0b0f" />
    </span>
  );
}

/** Small uppercase eyebrow label above a card field. */
export function CardEyebrow({ children }: { children: ReactNode }) {
  return <div className="text-faint uppercase-head card-eyebrow">{children}</div>;
}

/** A row of labeled money stats (Entry / Pot / …), evenly spaced. */
export function CardStats({ stats }: { stats: { label: string; value: number; tone?: string }[] }) {
  return (
    <div className="card-stats">
      {stats.map((s) => (
        <div key={s.label}>
          <div className="text-faint uppercase-head card-eyebrow">{s.label}</div>
          <div className="font-head tabular" style={{ fontWeight: 700, fontSize: '0.98rem', color: s.tone ?? 'var(--text)' }}>
            {formatCurrency(s.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

/** The fixed-rake disclosure line shown on every contest (Info + text). */
export function RakeNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-faint" style={{ fontSize: '0.72rem', lineHeight: 1.4 }}>
      <Info size={13} style={{ flexShrink: 0 }} />
      <span>{children}</span>
    </div>
  );
}
