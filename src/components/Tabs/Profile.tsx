import { Check, ExternalLink, Link2, Lock, ShieldCheck } from 'lucide-react';
import type { SkillProfile } from '../../types';
import type { UseWallet } from '../../hooks/useWallet';
import { Badge } from '../UI/Badge';
import { formatCurrency, formatPct } from '../../utils/oddsFormatter';
import { GAMES } from '../../utils/games';

interface ProfileProps {
  profile: SkillProfile | null;
  wallet: UseWallet;
  onGoLink: () => void;
}

const CHESS = 'chess.lichess';

export function Profile({ profile, wallet, onGoLink }: ProfileProps) {
  return (
    <div className="fade-in" style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 className="section-title">Profile</h2>
        <p className="text-faint" style={{ fontSize: '0.82rem', marginTop: 2 }}>
          Your linked accounts, verified skill, and wallet.
        </p>
      </div>

      {/* Linked accounts overview */}
      <div className="surface" style={{ padding: 18 }}>
        <div className="uppercase-head text-muted" style={{ fontSize: '0.72rem', marginBottom: 12 }}>Linked accounts</div>
        <div className="flex flex-col gap-2">
          {GAMES.map((g) => {
            const Icon = g.icon;
            const linked = g.id === CHESS && !!profile;
            return (
              <div key={g.id} className="flex items-center gap-3" style={{ padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                <span className="game-tile" style={{ background: g.gradient, width: 36, height: 36 }}>
                  <Icon size={18} strokeWidth={2.2} color="#0a0b0f" />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-head" style={{ fontWeight: 600 }}>{g.name}</div>
                  <div className="text-faint" style={{ fontSize: '0.74rem' }}>
                    {linked ? `Linked as ${profile?.display_name}` : g.live ? 'Not linked' : 'Coming soon'}
                  </div>
                </div>
                {linked ? (
                  <span className="status-pill is-linked"><Check size={12} strokeWidth={3} /> Linked</span>
                ) : g.live ? (
                  <button type="button" className="btn btn-ghost" style={{ gap: 6, fontSize: '0.78rem' }} onClick={onGoLink}>
                    <Link2 size={13} /> Link
                  </button>
                ) : (
                  <span className="status-pill"><Lock size={11} /> Soon</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Chess skill profile (when linked) */}
      {profile && (
        <div className="surface" style={{ padding: 18 }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="state-icon" style={{ width: 48, height: 48 }}>
                <ShieldCheck size={20} style={{ color: 'var(--lime)' }} />
              </div>
              <div>
                <div className="font-head" style={{ fontSize: '1.3rem', fontWeight: 700 }}>{profile.display_name}</div>
                <div className="flex items-center gap-2 text-faint" style={{ fontSize: '0.78rem' }}>
                  <span>Chess · linked via {profile.link_method === 'oauth' ? 'OAuth' : 'username'}</span>
                  {profile.account_age_days != null && (
                    <span>· {Math.floor(profile.account_age_days / 365)}y on record</span>
                  )}
                </div>
              </div>
            </div>
            <a href={profile.url} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ gap: 6, fontSize: '0.8rem', textDecoration: 'none' }}>
              <ExternalLink size={14} /> View profile
            </a>
          </div>

          <div className="flex items-center gap-5 flex-wrap" style={{ marginTop: 16 }}>
            <KV label="Win rate" value={formatPct(profile.win_rate)} />
            <KV label="Draw rate" value={formatPct(profile.draw_rate)} />
            <KV label="Rated games" value={profile.total_games.toLocaleString()} />
          </div>

          <div className="flex flex-wrap gap-2" style={{ marginTop: 16 }}>
            {profile.formats.map((f) => (
              <div key={f.speed} className="surface-raised flex items-center gap-2" style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <Badge variant={f.speed}>{f.speed}</Badge>
                <span className="font-head tabular" style={{ fontWeight: 700 }}>{f.rating}</span>
                <span className="text-faint" style={{ fontSize: '0.74rem' }}>{f.games.toLocaleString()} games</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wallet */}
      <div className="surface" style={{ padding: 18 }}>
        <div className="uppercase-head text-muted" style={{ fontSize: '0.72rem', marginBottom: 12 }}>Wallet</div>
        <div className="flex items-center gap-6 flex-wrap">
          <KV label="Available" value={formatCurrency(wallet.available)} color="var(--pos)" big />
          <KV label="Pending" value={formatCurrency(wallet.pending)} big />
          <KV label="Locked" value={formatCurrency(wallet.locked)} big />
        </div>
        <p className="text-faint" style={{ fontSize: '0.74rem', marginTop: 12, lineHeight: 1.5 }}>
          Play money. Stakes move available → pending on activation, and back (with
          payout) on settlement. No deposits or withdrawals in the demo.
        </p>
      </div>
    </div>
  );
}

function KV({ label, value, color, big }: { label: string; value: string; color?: string; big?: boolean }) {
  return (
    <div>
      <div className="text-faint uppercase-head" style={{ fontSize: '0.6rem' }}>{label}</div>
      <div className="font-head tabular" style={{ fontSize: big ? '1.4rem' : '1.05rem', fontWeight: 700, color: color ?? 'var(--text)' }}>
        {value}
      </div>
    </div>
  );
}
