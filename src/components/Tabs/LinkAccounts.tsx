import { useState } from 'react';
import { Check, Link2, Lock, LogOut } from 'lucide-react';
import type { SkillProfile } from '../../types';
import { GAMES, type GameMeta } from '../../utils/games';

interface LinkAccountsProps {
  profile: SkillProfile | null;
  link: (username: string) => Promise<boolean>;
  unlink: () => void;
  linking: boolean;
  error: string | null;
}

const CHESS = 'chess.lichess';

export function LinkAccounts({ profile, link, unlink, linking, error }: LinkAccountsProps) {
  const [openForm, setOpenForm] = useState<string | null>(null);
  const [provider, setProvider] = useState('lichess');
  const [username, setUsername] = useState('');

  const isLinked = (g: GameMeta) => g.id === CHESS && !!profile;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await link(username);
    if (ok) {
      setOpenForm(null);
      setUsername('');
    }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 16 }}>
        <h2 className="section-title">Link Accounts</h2>
        <p className="text-faint" style={{ fontSize: '0.82rem', marginTop: 2 }}>
          Connect a game account to unlock its contracts. Link more as we add titles.
        </p>
      </div>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))' }}
      >
        {GAMES.map((g) => {
          const linked = isLinked(g);
          const formOpen = openForm === g.id;
          const Icon = g.icon;
          // Blur the visual until the account is connected (or the form is open).
          const blur = !linked && !formOpen;

          return (
            <div key={g.id} className="game-card" style={{ ['--accent' as string]: g.color }}>
              <div className={blur ? 'blur-content' : undefined}>
                <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
                  <span className="game-tile" style={{ background: g.gradient }}>
                    <Icon size={22} strokeWidth={2.2} color="#0a0b0f" />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="font-head" style={{ fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.1 }}>
                      {g.name}
                    </div>
                    <div className="text-faint uppercase-head" style={{ fontSize: '0.66rem' }}>{g.tag}</div>
                  </div>
                </div>

                {linked && profile ? (
                  <LinkedBody profile={profile} onUnlink={unlink} />
                ) : (
                  <div className="text-faint" style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                    Connect via{' '}
                    {g.providers.map((p, i) => (
                      <span key={p.id}>
                        {i > 0 && ' / '}
                        <span className={p.live ? 'text-muted' : undefined}>{p.name}</span>
                        {!p.live && ' (soon)'}
                      </span>
                    ))}
                    .
                  </div>
                )}
              </div>

              {/* Overlay CTA / coming-soon lock */}
              {blur && (
                <div className="card-overlay">
                  {g.live ? (
                    <button type="button" className="btn btn-primary" style={{ gap: 8 }} onClick={() => setOpenForm(g.id)}>
                      <Link2 size={15} /> Link account
                    </button>
                  ) : (
                    <span className="soon-pill"><Lock size={12} /> Coming soon</span>
                  )}
                </div>
              )}

              {/* Inline link form (chess) */}
              {formOpen && g.live && (
                <form onSubmit={submit} style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="flex flex-wrap gap-2">
                    {g.providers.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`chip ${provider === p.id ? 'is-active' : ''}`}
                        disabled={!p.live}
                        onClick={() => p.live && setProvider(p.id)}
                        style={!p.live ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                      >
                        {!p.live && <Lock size={11} />} {p.name}{!p.live ? ' · soon' : ''}
                      </button>
                    ))}
                  </div>
                  <input
                    className="input"
                    placeholder={`${g.providers.find((p) => p.id === provider)?.name ?? ''} username`}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  {error && <span className="text-crimson" style={{ fontSize: '0.8rem' }}>{error}</span>}
                  <div className="flex gap-2">
                    <button type="submit" className="btn btn-primary" disabled={linking || !username.trim()} style={{ gap: 8, flex: 1 }}>
                      <Link2 size={15} /> {linking ? 'Linking…' : 'Link'}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => { setOpenForm(null); setUsername(''); }}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LinkedBody({ profile, onUnlink }: { profile: SkillProfile; onUnlink: () => void }) {
  const primary = profile.formats.find((f) => f.speed === profile.primary_speed) ?? profile.formats[0];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2" style={{ fontSize: '0.84rem' }}>
        <span className="linked-check"><Check size={13} strokeWidth={3} /></span>
        <span className="text-muted">Linked as <span className="text-pos">{profile.display_name}</span></span>
      </div>
      {primary && (
        <div className="text-faint" style={{ fontSize: '0.78rem' }}>
          {primary.speed} {primary.rating} · {profile.total_games.toLocaleString()} games
        </div>
      )}
      <button type="button" className="btn btn-ghost" style={{ gap: 6, fontSize: '0.8rem', alignSelf: 'flex-start' }} onClick={onUnlink}>
        <LogOut size={14} /> Unlink
      </button>
    </div>
  );
}
