import { useState } from 'react';
import { Bot, Check, Copy, ExternalLink, Loader, Swords, Users, X } from 'lucide-react';
import type { Match, MatchPlayer, SkillProfile, Speed, ToastVariant } from '../../types';
import type { UseWallet } from '../../hooks/useWallet';
import { useMatchmaking, type MmPlayer } from '../../hooks/useMatchmaking';
import { formatCurrency } from '../../utils/format';

interface FindOpponentProps {
  game: string;
  profile: SkillProfile;
  wallet: UseWallet;
  pushToast: (t: { variant: ToastVariant; title: string; description?: string }) => void;
}

const ENTRY_TIERS = [1, 5, 10, 25];
const ALL_SPEEDS: Speed[] = ['bullet', 'blitz', 'rapid', 'classical'];
const SPEED_LABEL: Record<string, string> = { bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rapid', classical: 'Classical' };
// Non-chess H2H titles → (mode used as `speed`, human format, how to reach the opponent).
const MODE: Record<string, { mode: string; format: string; verb: string }> = {
  'cs2.faceit': { mode: 'cs2', format: 'Competitive', verb: 'Add {handle} on FaceIt and start a match together.' },
  'dota2.opendota': { mode: 'dota2', format: 'Ranked', verb: 'Invite {handle} to a Dota 2 lobby.' },
};

export function FindOpponent({ game, profile, wallet, pushToast }: FindOpponentProps) {
  const isChess = game === 'chess.lichess';
  const speeds = profile.formats?.length ? profile.formats.map((f) => f.speed) : ALL_SPEEDS;
  const [entry, setEntry] = useState(5);
  const [speed, setSpeed] = useState<string>(profile.primary_speed ?? speeds[0]);

  const rating = isChess
    ? (profile.formats?.find((f) => f.speed === speed)?.rating ?? profile.formats?.[0]?.rating ?? 1500)
    : (profile.rating ?? 1500);
  const me: MmPlayer = { id: profile.username, name: profile.display_name, rating };

  const mm = useMatchmaking({
    game,
    me,
    onEscrow: (e) => {
      wallet.escrowEntry(e);
      pushToast({ variant: 'success', title: 'Match confirmed', description: `${formatCurrency(e)} escrowed. Go play!` });
    },
    onResolved: (match: Match, mine: MatchPlayer | undefined) => {
      const payout = mine?.payout ?? 0;
      const isLoss = match.outcome === 'settled' && payout === 0;
      wallet.applySettlement({ entry: match.entry, payout, isLoss });
      if (match.outcome === 'refunded') {
        pushToast({ variant: 'info', title: 'Match refunded', description: `${formatCurrency(match.entry)} returned.` });
      } else if (payout > 0) {
        pushToast({ variant: 'win', title: 'You won!', description: `+${formatCurrency(payout - match.entry)} (pot minus rake).` });
      } else {
        pushToast({ variant: 'loss', title: 'You lost', description: `${formatCurrency(match.entry)} entry.` });
      }
    },
  });

  const { phase, match, mine, opponent, escrowed } = mm;
  const modeInfo = MODE[game];
  const format = isChess ? `Rated ${SPEED_LABEL[speed] ?? speed}` : (modeInfo?.format ?? 'Ranked');

  const start = () => {
    if (!wallet.canJoin(entry)) {
      pushToast({ variant: 'loss', title: 'Cannot queue', description: 'Insufficient balance or daily loss limit reached.' });
      return;
    }
    mm.find(entry, isChess ? speed : (modeInfo?.mode ?? game), format);
  };

  const copyHandle = () => {
    if (opponent) {
      navigator.clipboard?.writeText(opponent.player_id);
      pushToast({ variant: 'info', title: 'Copied', description: `${opponent.player_id} copied to clipboard.` });
    }
  };

  return (
    <div className="surface" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="flex items-center gap-2">
        <Users size={16} style={{ color: 'var(--lime)' }} />
        <span className="font-head" style={{ fontWeight: 700, fontSize: '1.05rem' }}>Find a real opponent</span>
      </div>

      {phase === 'idle' && (
        <>
          <div>
            <div className="text-faint uppercase-head" style={{ fontSize: '0.6rem', marginBottom: 6 }}>Entry</div>
            <div className="flex flex-wrap gap-2">
              {ENTRY_TIERS.map((t) => (
                <button key={t} type="button" className={`chip ${entry === t ? 'is-active' : ''}`} onClick={() => setEntry(t)}>${t}</button>
              ))}
            </div>
          </div>
          {isChess && (
            <div>
              <div className="text-faint uppercase-head" style={{ fontSize: '0.6rem', marginBottom: 6 }}>Time control</div>
              <div className="flex flex-wrap gap-2">
                {speeds.map((s) => (
                  <button key={s} type="button" className={`chip ${speed === s ? 'is-active' : ''}`} onClick={() => setSpeed(s)}>{SPEED_LABEL[s] ?? s}</button>
                ))}
              </div>
            </div>
          )}
          <button type="button" className="btn btn-primary" style={{ justifyContent: 'center', gap: 8, padding: '11px' }} onClick={start}>
            <Swords size={16} /> Find opponent · {formatCurrency(entry)}
          </button>
          <span className="text-faint" style={{ fontSize: '0.72rem' }}>
            Paired with a real player in your bracket. Both stake; the winner takes the pot minus rake.
          </span>
        </>
      )}

      {phase === 'searching' && (
        <div className="flex flex-col gap-3">
          <span className="flex items-center gap-2 text-muted" style={{ fontSize: '0.9rem' }}>
            <Loader size={16} className="spin" /> Searching for an opponent…
          </span>
          <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-start', gap: 6 }} onClick={mm.cancel}>
            <X size={14} /> Cancel
          </button>
        </div>
      )}

      {phase === 'pending' && match && opponent && (
        <div className="flex flex-col gap-3">
          <span className="uppercase-head text-pos" style={{ fontSize: '0.66rem', fontWeight: 700 }}>Match found</span>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-2 text-muted" style={{ fontSize: '0.9rem' }}>
              <Bot size={14} /> vs <span className="text-pos">{opponent.display_name}</span> · {opponent.rating}
            </span>
            <span className="text-faint" style={{ fontSize: '0.8rem' }}>
              Entry {formatCurrency(match.entry)} · pot {formatCurrency(match.pot)} · {Math.round(match.rake_pct * 100)}% rake · win {formatCurrency(match.prize)}
            </span>
          </div>
          {mine?.confirmed ? (
            <span className="flex items-center gap-2 text-faint" style={{ fontSize: '0.84rem' }}>
              <Loader size={15} className="spin" /> Waiting for {opponent.display_name} to confirm…
            </span>
          ) : (
            <div className="flex gap-2">
              <button type="button" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', gap: 8, padding: '11px' }} onClick={mm.confirm}>
                <Check size={16} /> Confirm · escrow {formatCurrency(match.entry)}
              </button>
              <button type="button" className="btn btn-ghost" onClick={mm.cancel}>Decline</button>
            </div>
          )}
        </div>
      )}

      {phase === 'active' && match && (
        <div className="flex flex-col gap-3">
          <span className="uppercase-head text-pos" style={{ fontSize: '0.66rem', fontWeight: 700 }}>You're in</span>
          {match.brokered && mine?.play_url ? (
            <a href={mine.play_url} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ justifyContent: 'center', gap: 8, padding: '11px', textDecoration: 'none' }}>
              <Swords size={16} /> Go play your match <ExternalLink size={13} />
            </a>
          ) : (
            <div className="surface-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="text-muted" style={{ fontSize: '0.84rem' }}>
                {(modeInfo?.verb ?? 'Play your match against {handle}.').replace('{handle}', opponent?.display_name ?? 'your opponent')}
              </span>
              <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-start', gap: 6, fontSize: '0.82rem' }} onClick={copyHandle}>
                <Copy size={14} /> Copy {opponent?.player_id}
              </button>
            </div>
          )}
          <span className="flex items-center gap-2 text-faint" style={{ fontSize: '0.8rem' }}>
            <Loader size={14} className="spin" /> Waiting for your result… settles automatically when the match finishes.
          </span>
        </div>
      )}

      {phase === 'done' && match && (
        <div className="flex flex-col gap-3">
          {escrowed ? (
            <div className="flex items-center justify-between">
              <span
                className="uppercase-head"
                style={{ fontSize: '0.66rem', fontWeight: 700, color: (mine?.payout ?? 0) > match.entry ? 'var(--pos)' : match.outcome === 'refunded' ? 'var(--text-muted)' : 'var(--crimson)' }}
              >
                {match.outcome === 'refunded' ? 'Refunded' : (mine?.payout ?? 0) > 0 ? 'You won' : 'You lost'}
              </span>
              <span className="font-head tabular" style={{ fontWeight: 700, color: (mine?.payout ?? 0) >= match.entry ? 'var(--pos)' : 'var(--text-muted)' }}>
                {(mine?.payout ?? 0) > 0 ? `+${formatCurrency(mine?.payout ?? 0)}` : formatCurrency(0)}
              </span>
            </div>
          ) : (
            <span className="text-muted" style={{ fontSize: '0.9rem' }}>Match canceled.</span>
          )}
          <button type="button" className="btn btn-primary" style={{ justifyContent: 'center', gap: 8 }} onClick={mm.reset}>
            <Swords size={15} /> Find another
          </button>
        </div>
      )}

      {mm.error && <span className="text-crimson" style={{ fontSize: '0.8rem' }}>{mm.error}</span>}
    </div>
  );
}
