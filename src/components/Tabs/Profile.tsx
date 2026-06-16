import { ExternalLink, LogOut, ShieldCheck } from 'lucide-react';
import type { SkillProfile } from '../../types';
import type { UseWallet } from '../../hooks/useWallet';
import { Badge } from '../UI/Badge';
import { formatCurrency, formatPct } from '../../utils/oddsFormatter';

interface ProfileProps {
  profile: SkillProfile;
  wallet: UseWallet;
  onUnlink: () => void;
}

export function Profile({ profile, wallet, onUnlink }: ProfileProps) {
  return (
    <div className="fade-in" style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 className="section-title">Profile</h2>
        <p className="text-faint" style={{ fontSize: '0.82rem', marginTop: 2 }}>
          Verified identity, skill profile, and wallet.
        </p>
      </div>

      {/* Identity */}
      <div className="surface" style={{ padding: 18 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="state-icon" style={{ width: 48, height: 48 }}>
              <ShieldCheck size={20} style={{ color: 'var(--lime)' }} />
            </div>
            <div>
              <div className="font-head" style={{ fontSize: '1.3rem', fontWeight: 700 }}>{profile.display_name}</div>
              <div className="flex items-center gap-2 text-faint" style={{ fontSize: '0.78rem' }}>
                <span>Linked via {profile.link_method === 'oauth' ? 'OAuth' : 'username claim'}</span>
                {profile.account_age_days != null && (
                  <span>· {Math.floor(profile.account_age_days / 365)}y on Lichess</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={profile.url} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ gap: 6, fontSize: '0.8rem', textDecoration: 'none' }}>
              <ExternalLink size={14} /> Lichess
            </a>
            <button type="button" className="btn btn-ghost" style={{ gap: 6, fontSize: '0.8rem' }} onClick={onUnlink}>
              <LogOut size={14} /> Unlink
            </button>
          </div>
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

      {/* Wallet */}
      <div className="surface" style={{ padding: 18 }}>
        <div className="uppercase-head text-muted" style={{ fontSize: '0.72rem', marginBottom: 12 }}>Wallet</div>
        <div className="flex items-center gap-6 flex-wrap">
          <KV label="Available" value={formatCurrency(wallet.available)} color="var(--lime)" big />
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
