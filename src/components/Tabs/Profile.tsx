import { ExternalLink, ShieldCheck } from 'lucide-react';
import type { Contract, SkillProfile } from '../../types';
import type { UseWallet } from '../../hooks/useWallet';
import { Badge } from '../UI/Badge';
import { LinkAccounts, type Linker } from './LinkAccounts';
import { MyContests } from './MyContests';
import { formatCurrency, formatPct } from '../../utils/format';

interface ProfileProps {
  profile: SkillProfile | null;
  wallet: UseWallet;
  /** Per-game linking state, keyed by adapter id (chess, cs2, …). */
  linkers: Record<string, Linker>;
  settled: Contract[];
}

export function Profile({ profile, wallet, linkers, settled }: ProfileProps) {
  return (
    <div style={{ maxWidth: 960, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ marginBottom: -8 }}>
        <h2 className="section-title">Profile</h2>
        <p className="page-subtitle">Linked accounts, skill, wallet, and history.</p>
      </div>

      {/* Link accounts (full feature) */}
      <LinkAccounts linkers={linkers} />

      {/* Chess verified skill (when linked) */}
      {profile && profile.formats.length > 0 && (
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
            <KV label="Draw rate" value={formatPct(profile.draw_rate ?? 0)} />
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
          <KV label="Escrow" value={formatCurrency(wallet.escrow)} big />
          <KV label="Locked" value={formatCurrency(wallet.locked)} big />
        </div>
        <p className="text-faint" style={{ fontSize: '0.74rem', marginTop: 12, lineHeight: 1.5 }}>
          Entries move available → escrow when you confirm a match, and the pot
          (minus rake) pays the winner on settlement.
        </p>
      </div>

      {/* Contest history + P&L */}
      <MyContests settled={settled} />
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
