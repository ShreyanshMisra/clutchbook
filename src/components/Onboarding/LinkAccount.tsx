import { useState } from 'react';
import { Link2, ShieldCheck, Zap } from 'lucide-react';

interface LinkAccountProps {
  onLink: (username: string) => Promise<boolean>;
  linking: boolean;
  error: string | null;
}

/**
 * Landing + account-link surface (roadmap §1.2). The demo uses the
 * username-claim path; the "Sign in with Lichess" OAuth button is the
 * production path and is shown as the recommended option.
 */
export function LinkAccount({ onLink, linking, error }: LinkAccountProps) {
  const [username, setUsername] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void onLink(username);
  };

  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ minHeight: '100vh', padding: 24 }}
    >
      <div className="fade-in" style={{ width: '100%', maxWidth: 460 }}>
        {/* Brand */}
        <div className="flex items-center justify-center gap-2" style={{ marginBottom: 8 }}>
          <span aria-hidden style={{ color: 'var(--lime)', fontFamily: 'var(--font-head)', fontSize: '2rem', lineHeight: 1 }}>
            ⟁
          </span>
          <span className="uppercase-head" style={{ fontWeight: 700, fontSize: '2rem', letterSpacing: '0.06em' }}>
            money <span className="text-lime">match</span>
          </span>
        </div>
        <p className="text-muted" style={{ textAlign: 'center', marginBottom: 28, lineHeight: 1.5 }}>
          Wager on your own chess. Take a personalized skill contract, play your
          normal games on Lichess, and we settle it automatically against your
          verified results.
        </p>

        <div className="surface" style={{ padding: 22 }}>
          <div className="uppercase-head text-muted" style={{ fontSize: '0.72rem', marginBottom: 12 }}>
            Link your Lichess account
          </div>

          {/* Production OAuth path (disabled in the demo). */}
          <button
            type="button"
            className="btn"
            disabled
            title="OAuth is the production path — the demo uses the username claim below"
            style={{ width: '100%', justifyContent: 'center', gap: 8, padding: '11px', marginBottom: 14, opacity: 0.55 }}
          >
            <ShieldCheck size={16} /> Sign in with Lichess (OAuth)
          </button>

          <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
            <hr className="divider" style={{ flex: 1 }} />
            <span className="text-faint uppercase-head" style={{ fontSize: '0.66rem' }}>
              or claim a username
            </span>
            <hr className="divider" style={{ flex: 1 }} />
          </div>

          <form onSubmit={submit}>
            <input
              className="input"
              placeholder="Lichess username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              style={{ marginBottom: 10, fontFamily: 'var(--font-body)', fontWeight: 500 }}
            />
            {error && (
              <div className="text-crimson" style={{ fontSize: '0.82rem', marginBottom: 10 }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={linking || !username.trim()}
              style={{ width: '100%', justifyContent: 'center', gap: 8, padding: '12px' }}
            >
              <Link2 size={16} />
              {linking ? 'Linking…' : 'Link account'}
            </button>
          </form>

          <div
            className="flex items-start gap-2 text-faint"
            style={{ fontSize: '0.74rem', marginTop: 14, lineHeight: 1.5 }}
          >
            <Zap size={14} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>
              Play money only — no deposits, no withdrawals. We read public stats
              from{' '}
              <a href="https://lichess.org" target="_blank" rel="noreferrer" className="text-cyan" style={{ textDecoration: 'none' }}>
                Lichess
              </a>{' '}
              to price contracts and verify results.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
