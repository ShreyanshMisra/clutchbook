import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Hammer, Info, Lock, Swords } from 'lucide-react';
import type {
  Contract,
  ContractDraft,
  Objective,
  ObjectiveKind,
  SkillProfile,
  Speed,
} from '../../types';
import { priceDraft } from '../../utils/apiClient';
import { track } from '../../utils/telemetry';
import { GAMES } from '../../utils/games';
import { formatCurrency } from '../../utils/format';
import { matchQualityTone } from '../../utils/contractText';

interface BuilderProps {
  profile: SkillProfile;
  canJoin: (entry: number) => boolean;
  onJoin: (contest: Contract) => void;
}

const KINDS: { key: ObjectiveKind; label: string }[] = [
  { key: 'win_h2h', label: 'Win the match' },
  { key: 'win_under_moves', label: 'Win quickly' },
];

const ALL_SPEEDS: Speed[] = ['bullet', 'blitz', 'rapid', 'classical'];
const SPEED_LABEL: Record<Speed, string> = {
  bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rapid', classical: 'Classical',
};
const ENTRY_TIERS = [1, 5, 10, 25, 50, 100];
const CHESS_GAME = 'chess.lichess';

function windowFor(kind: ObjectiveKind): number {
  return kind === 'win_under_moves' ? 8 : 6;
}

export function Builder({ profile, canJoin, onJoin }: BuilderProps) {
  const speeds = profile.formats.length ? profile.formats.map((f) => f.speed) : ALL_SPEEDS;

  const [game, setGame] = useState<string>(CHESS_GAME);
  const isChess = game === CHESS_GAME;
  const [kind, setKind] = useState<ObjectiveKind>('win_h2h');
  const [speed, setSpeed] = useState<Speed>(profile.primary_speed);
  const [moves, setMoves] = useState(30);
  const [entry, setEntry] = useState(5);

  const [priced, setPriced] = useState<Contract | null>(null);
  const [pricing, setPricing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const buildDraft = useCallback((): ContractDraft => {
    const objective: Objective = { kind };
    if (kind === 'win_under_moves') objective.moves = moves;
    return {
      game,
      speed,
      format: `Rated ${SPEED_LABEL[speed]}`,
      objective,
      window_hours: windowFor(kind),
      entry,
    };
  }, [game, kind, speed, moves, entry]);

  // Debounced live matchmaking + pricing.
  const timer = useRef<number | null>(null);
  useEffect(() => {
    setConfirming(false);
    if (timer.current) window.clearTimeout(timer.current);
    setPricing(true);
    setError(null);
    timer.current = window.setTimeout(() => {
      const draft = buildDraft();
      priceDraft(profile.username, draft)
        .then((c) => {
          setPriced(c);
          track('builder_priced', { kind: draft.objective.kind, speed: draft.speed, entry: draft.entry });
        })
        .catch((err: Error) => setError(err.message || 'Could not build that contest'))
        .finally(() => setPricing(false));
    }, 400);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [buildDraft, profile.username]);

  const allowed = priced != null && canJoin(entry) && entry >= 1 && entry <= 100;

  const join = () => {
    if (!priced) return;
    onJoin(priced);
    setConfirming(false);
  };

  return (
    <div className="surface" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Game picker */}
      <Field label="Game">
        <div className="flex flex-wrap gap-2">
          {GAMES.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`chip ${game === g.id ? 'is-active' : ''}`}
              disabled={!g.live}
              title={g.live ? undefined : 'Coming soon'}
              onClick={() => g.live && setGame(g.id)}
              style={!g.live ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            >
              {!g.live && <Lock size={11} style={{ marginRight: 4 }} />}
              {g.name}
            </button>
          ))}
        </div>
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

      {/* Move limit */}
      {kind === 'win_under_moves' && (
        <Field label="Move limit">
          <NumberInput value={moves} min={5} max={120} onChange={setMoves} suffix="moves" />
        </Field>
      )}

      {/* Entry tier */}
      <Field label="Entry">
        <div className="flex flex-wrap gap-2">
          {ENTRY_TIERS.map((t) => (
            <button
              key={t}
              type="button"
              className={`chip ${entry === t ? 'is-active' : ''}`}
              onClick={() => setEntry(t)}
            >
              ${t}
            </button>
          ))}
        </div>
      </Field>

      {/* Matched preview */}
      <div className="surface-card" style={{ padding: 18 }}>
        {error ? (
          <span className="text-crimson">{error}</span>
        ) : priced ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div style={{ minWidth: 0 }}>
                <h3 className="font-head" style={{ fontSize: '1.15rem', fontWeight: 600 }}>{priced.title}</h3>
                <div className="flex items-center gap-2 text-muted" style={{ fontSize: '0.78rem', marginTop: 6 }}>
                  {priced.opponent.is_bot && <Bot size={13} />}
                  vs {priced.opponent.display_name} · {priced.opponent.rating}
                  <span
                    className="uppercase-head"
                    style={{ fontSize: '0.6rem', fontWeight: 600, color: matchQualityTone(priced.bracket.match_quality) }}
                  >
                    · {priced.bracket.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-faint" style={{ fontSize: '0.72rem', marginTop: 6 }}>
                  <Info size={13} />
                  <span>
                    Pot {formatCurrency(priced.pot)} · {Math.round(priced.rake_pct * 100)}% rake ({formatCurrency(priced.rake)})
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="text-faint uppercase-head" style={{ fontSize: '0.6rem' }}>Win to take</div>
                <div className="font-head tabular" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--lime)' }}>
                  {formatCurrency(priced.prize)}
                </div>
              </div>
            </div>

            {confirming ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!allowed || pricing}
                  style={{ flex: 1, justifyContent: 'center', gap: 8, padding: '11px' }}
                  onClick={join}
                >
                  <Swords size={16} /> Confirm match · escrow {formatCurrency(entry)}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>
                  Decline
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={!allowed || pricing}
                style={{ width: '100%', justifyContent: 'center', gap: 8, padding: '11px' }}
                onClick={() => setConfirming(true)}
              >
                <Swords size={16} /> Find match
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-faint">
            <Hammer size={16} /> {pricing ? 'Finding a match…' : 'Configure a contest above.'}
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
