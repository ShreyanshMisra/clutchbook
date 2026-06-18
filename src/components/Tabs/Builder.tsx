import { useCallback, useEffect, useRef, useState } from 'react';
import { Hammer, Info, Lock, Zap } from 'lucide-react';
import type {
  Contract,
  ContractDraft,
  Objective,
  ObjectiveKind,
  OddsFormat,
  PerfMetric,
  SkillProfile,
  Speed,
} from '../../types';
import { priceDraft } from '../../utils/apiClient';
import { track } from '../../utils/telemetry';
import { GAMES } from '../../utils/games';
import {
  formatCurrency,
  formatLine,
  formatMultiplier,
  formatPct,
} from '../../utils/oddsFormatter';

interface BuilderProps {
  profile: SkillProfile;
  format: OddsFormat;
  canActivate: (stake: number) => boolean;
  onActivate: (contract: Contract, stake: number) => void;
}

const KINDS: { key: ObjectiveKind; label: string }[] = [
  { key: 'win_game', label: 'Win next game' },
  { key: 'win_under_moves', label: 'Win quickly' },
  { key: 'win_series', label: 'Win a series' },
  { key: 'performance_line', label: 'Performance line' },
];

const ALL_SPEEDS: Speed[] = ['bullet', 'blitz', 'rapid', 'classical'];
const SPEED_LABEL: Record<Speed, string> = {
  bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rapid', classical: 'Classical',
};

// Objective shapes that depend on chess-specific concepts (time controls, move
// counts). Hidden unless a chess contract is being built so the builder reads
// game-agnostic for future titles.
const CHESS_GAME = 'chess.lichess';

function windowFor(kind: ObjectiveKind): number {
  if (kind === 'win_game') return 6;
  if (kind === 'win_under_moves') return 8;
  return 24;
}

export function Builder({ profile, format, canActivate, onActivate }: BuilderProps) {
  const speeds = profile.formats.length ? profile.formats.map((f) => f.speed) : ALL_SPEEDS;

  // Which titles to build on. Multiple selections produce one contract per
  // game (priced independently). Only `live` games can be selected today.
  const [games, setGames] = useState<string[]>([CHESS_GAME]);
  const buildGame = games[0] ?? CHESS_GAME;
  const isChess = buildGame === CHESS_GAME;

  const [kind, setKind] = useState<ObjectiveKind>('win_game');
  const [speed, setSpeed] = useState<Speed>(profile.primary_speed);
  const [moves, setMoves] = useState(30);
  const [count, setCount] = useState(5);
  const [seriesWins, setSeriesWins] = useState(3);
  const [metric, setMetric] = useState<PerfMetric>('win_rate');
  const [side, setSide] = useState<'over' | 'under'>('over');
  const [line, setLine] = useState(0.5);
  const [stake, setStake] = useState(10);

  const [priced, setPriced] = useState<Contract | null>(null);
  const [pricing, setPricing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // win_under_moves only applies to chess; fall back to win_game elsewhere.
  const effectiveKind: ObjectiveKind =
    !isChess && kind === 'win_under_moves' ? 'win_game' : kind;

  const toggleGame = (id: string) => {
    setGames((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  const buildDraft = useCallback((): ContractDraft => {
    const objective: Objective = {
      kind: effectiveKind,
      games: effectiveKind === 'win_game' || effectiveKind === 'win_under_moves' ? 1 : count,
    };
    if (effectiveKind === 'win_under_moves') objective.moves = moves;
    if (effectiveKind === 'win_series') objective.series_wins = Math.min(seriesWins, count);
    if (effectiveKind === 'performance_line') {
      objective.metric = metric;
      objective.side = side;
      objective.line = line;
    }
    return {
      game: buildGame,
      speed,
      format: `Rated ${SPEED_LABEL[speed]}`,
      objective,
      window_hours: windowFor(effectiveKind),
      stake,
    };
  }, [effectiveKind, buildGame, speed, moves, count, seriesWins, metric, side, line, stake]);

  // Debounced live pricing. Only the live game can be priced today.
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (!games.length) {
      setPriced(null);
      setPricing(false);
      return;
    }
    if (timer.current) window.clearTimeout(timer.current);
    setPricing(true);
    setError(null);
    timer.current = window.setTimeout(() => {
      const draft = buildDraft();
      priceDraft(profile.username, draft)
        .then((c) => {
          setPriced(c);
          track('builder_priced', { kind: draft.objective.kind, speed: draft.speed, game: draft.game });
        })
        .catch((err: Error) => setError(err.message || 'Could not price that contract'))
        .finally(() => setPricing(false));
    }, 400);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [buildDraft, profile.username, games.length]);

  const allowed =
    priced != null && games.length > 0 && canActivate(stake) && stake >= 1 && stake <= 100;

  // One contract per selected game (overview §6 — same line, one per title).
  const activate = () => {
    if (!priced) return;
    games.forEach((id) => onActivate({ ...priced, game: id }, stake));
  };

  return (
    <div className="surface" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Game picker */}
      <Field label="Game">
        <div className="flex flex-wrap gap-2">
          {GAMES.map((g) => {
            const selected = games.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                className={`chip ${selected ? 'is-active' : ''}`}
                disabled={!g.live}
                title={g.live ? undefined : 'Coming soon'}
                onClick={() => g.live && toggleGame(g.id)}
                style={!g.live ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                {!g.live && <Lock size={11} style={{ marginRight: 4 }} />}
                {g.name}
              </button>
            );
          })}
        </div>
        <p className="text-faint" style={{ fontSize: '0.72rem', marginTop: 6 }}>
          {games.length > 1
            ? `You'll get one contract per game (${games.length}).`
            : 'Pick one or more games. More titles unlock soon.'}
        </p>
      </Field>

      {/* Objective family */}
      <Field label="Objective">
        <div className="flex flex-wrap gap-2">
          {KINDS.filter((k) => isChess || k.key !== 'win_under_moves').map((k) => (
            <button
              key={k.key}
              type="button"
              className={`chip ${kind === k.key ? 'is-active' : ''}`}
              onClick={() => setKind(k.key)}
            >
              {k.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Time control (chess) */}
      {isChess && (
        <Field label="Time control">
          <div className="flex flex-wrap gap-2">
            {speeds.map((s) => (
              <button
                key={s}
                type="button"
                className={`chip ${speed === s ? 'is-active' : ''}`}
                onClick={() => setSpeed(s)}
              >
                {SPEED_LABEL[s]}
              </button>
            ))}
          </div>
        </Field>
      )}

      {/* Kind-specific params */}
      {effectiveKind === 'win_under_moves' && (
        <Field label="Move limit">
          <NumberInput value={moves} min={5} max={120} onChange={setMoves} suffix="moves" />
        </Field>
      )}

      {effectiveKind === 'win_series' && (
        <div className="flex gap-4 flex-wrap">
          <Field label="Games in series">
            <NumberInput value={count} min={2} max={10} onChange={setCount} />
          </Field>
          <Field label="Wins needed">
            <NumberInput value={seriesWins} min={1} max={count} onChange={setSeriesWins} />
          </Field>
        </div>
      )}

      {effectiveKind === 'performance_line' && (
        <div className="flex gap-4 flex-wrap" style={{ alignItems: 'flex-end' }}>
          <Field label="Metric">
            <div className="flex gap-2">
              {(['win_rate', 'avg_moves'] as PerfMetric[]).map((m) => (
                <button key={m} type="button" className={`chip ${metric === m ? 'is-active' : ''}`} onClick={() => setMetric(m)}>
                  {m === 'win_rate' ? 'Win rate' : 'Avg moves'}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Side">
            <div className="flex gap-2">
              {(['over', 'under'] as const).map((s) => (
                <button key={s} type="button" className={`chip ${side === s ? 'is-active' : ''}`} onClick={() => setSide(s)}>
                  {s}
                </button>
              ))}
            </div>
          </Field>
          <Field label={metric === 'win_rate' ? 'Line (0–1)' : 'Line (moves)'}>
            <NumberInput
              value={line}
              min={metric === 'win_rate' ? 0 : 5}
              max={metric === 'win_rate' ? 1 : 120}
              step={metric === 'win_rate' ? 0.05 : 1}
              onChange={setLine}
            />
          </Field>
          <Field label="Over how many games">
            <NumberInput value={count} min={2} max={20} onChange={setCount} />
          </Field>
        </div>
      )}

      {/* Stake */}
      <Field label="Stake">
        <NumberInput value={stake} min={1} max={100} onChange={setStake} prefix="$" />
      </Field>

      {/* Priced preview */}
      <div className="surface-card" style={{ padding: 18 }}>
        {games.length === 0 ? (
          <div className="flex items-center gap-2 text-faint">
            <Hammer size={16} /> Pick a game to build a contract.
          </div>
        ) : error ? (
          <span className="text-crimson">{error}</span>
        ) : priced ? (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div style={{ minWidth: 0 }}>
              <h3 className="font-head" style={{ fontSize: '1.15rem', fontWeight: 600 }}>{priced.title}</h3>
              <div className="flex items-center gap-2 text-faint" style={{ fontSize: '0.72rem', marginTop: 6 }}>
                <Info size={13} />
                <span>
                  Fair {formatMultiplier(priced.line.fair_decimal)} · ~{formatPct(priced.line.fair_prob)} to hit ·{' '}
                  {priced.line.house_edge_pct}% house edge
                </span>
              </div>
            </div>
            <div className="flex items-center gap-5" style={{ flexShrink: 0 }}>
              <div style={{ textAlign: 'right' }}>
                <div className="text-faint uppercase-head" style={{ fontSize: '0.6rem' }}>Multiplier</div>
                <div className="font-head" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--lime)' }}>
                  {formatLine(priced.line.american, priced.line.decimal, format)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="text-faint uppercase-head" style={{ fontSize: '0.6rem' }}>Pays</div>
                <div className="font-head tabular" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {formatCurrency(stake * priced.line.decimal)}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!allowed || pricing}
                style={{ gap: 8, padding: '11px 16px' }}
                onClick={activate}
              >
                <Zap size={16} /> Activate{games.length > 1 ? ` ×${games.length}` : ''}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-faint">
            <Hammer size={16} /> {pricing ? 'Pricing…' : 'Configure a contract above.'}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-faint uppercase-head" style={{ fontSize: '0.62rem', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function NumberInput({
  value, min, max, step = 1, onChange, prefix, suffix,
}: {
  value: number; min: number; max: number; step?: number;
  onChange: (n: number) => void; prefix?: string; suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {prefix && <span className="text-muted">{prefix}</span>}
      <input
        type="number"
        className="input"
        style={{ width: 110 }}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {suffix && <span className="text-faint" style={{ fontSize: '0.8rem' }}>{suffix}</span>}
    </div>
  );
}
