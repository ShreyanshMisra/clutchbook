import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Hammer, Info, Swords } from 'lucide-react';
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
import { formatCurrency } from '../../utils/format';
import { matchQualityTone } from '../../utils/contractText';

interface BuilderProps {
  /** The game this creator builds contests for (the page-level tab selects it). */
  game: string;
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

// Non-chess H2H titles → (game-mode used as `speed`, human format label).
const MATCH_MODE: Record<string, { mode: string; format: string }> = {
  'cs2.faceit': { mode: 'cs2', format: 'Competitive' },
  'dota2.opendota': { mode: 'dota2', format: 'Ranked' },
};

function windowFor(kind: ObjectiveKind): number {
  return kind === 'win_under_moves' ? 8 : 6;
}

export function Builder({ game, profile, canJoin, onJoin }: BuilderProps) {
  const isChess = game === CHESS_GAME;
  const speeds = profile.formats?.length ? profile.formats.map((f) => f.speed) : ALL_SPEEDS;

  const [kind, setKind] = useState<ObjectiveKind>('win_h2h');
  const [speed, setSpeed] = useState<Speed>(profile.primary_speed ?? speeds[0]);
  const [moves, setMoves] = useState(30);
  const [entry, setEntry] = useState(5);

  const [priced, setPriced] = useState<Contract | null>(null);
  const [pricing, setPricing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const buildDraft = useCallback((): ContractDraft => {
    if (!isChess) {
      const m = MATCH_MODE[game] ?? { mode: game, format: 'Ranked' };
      return {
        game, speed: m.mode, format: m.format,
        objective: { kind: 'win_h2h' }, window_hours: 12, entry,
      };
    }
    const objective: Objective = { kind };
    if (kind === 'win_under_moves') objective.moves = moves;
    return {
      game, speed, format: `Rated ${SPEED_LABEL[speed]}`,
      objective, window_hours: windowFor(kind), entry,
    };
  }, [game, isChess, kind, speed, moves, entry]);

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
          track('builder_priced', { game, kind: draft.objective.kind, entry: draft.entry });
        })
        .catch((err: Error) => setError(err.message || 'Could not build that contest'))
        .finally(() => setPricing(false));
    }, 400);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [buildDraft, profile.username, game]);

  const allowed = priced != null && canJoin(entry) && entry >= 1 && entry <= 100;

  const join = () => {
    if (!priced) return;
    onJoin(priced);
    setConfirming(false);
  };

  return (
    <div className="surface" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Objective family (chess offers "win quickly"; other titles are win-the-match) */}
      {isChess && (
        <Field label="Objective">
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
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
      )}

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
      {isChess && kind === 'win_under_moves' && (
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
