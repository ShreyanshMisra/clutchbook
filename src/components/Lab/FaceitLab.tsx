/**
 * FaceIt Lab — dev sandbox for poking at the FaceIt API.
 * Mounted at ?lab=faceit. Not linked to wallets or money.
 *
 * Sections:
 *   1. Nickname input → SkillProfile
 *   2. Recent matches table (NormGame rows)
 *   3. Stat distribution (summary bars)
 *   4. Simulate resolution (latest match vs an illustrative contract)
 */

import { useState } from 'react';
import {
  fetchFaceitDistribution,
  fetchFaceitMatches,
  fetchFaceitTelemetry,
  fetchProfile,
  type FaceitDistribution,
  type FaceitMatchRow,
} from '../../utils/apiClient';
import type { SkillProfile } from '../../types';
import { formatCurrency } from '../../utils/format';

const CS2_METRICS = [
  { key: 'cs2_kills', label: 'Kills' },
  { key: 'cs2_kd_ratio', label: 'K/D Ratio' },
  { key: 'cs2_headshot_pct', label: 'Headshot %' },
  { key: 'cs2_adr', label: 'ADR' },
  { key: 'cs2_mvps', label: 'MVPs' },
];

function fmt(v: number | undefined | null): string {
  if (v == null) return '–';
  return Number.isInteger(v) ? v.toString() : v.toFixed(2);
}

function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// Minimal bar-chart sparkline using CSS.
function DistBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 80, fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--lime)', borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <div style={{ width: 48, fontSize: '0.72rem', color: '#fff', textAlign: 'right', flexShrink: 0 }}>
        {fmt(value)}
      </div>
    </div>
  );
}

export function FaceitLab() {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<SkillProfile | null>(null);
  const [matches, setMatches] = useState<FaceitMatchRow[]>([]);
  const [dist, setDist] = useState<FaceitDistribution | null>(null);
  const [distMetric, setDistMetric] = useState('cs2_kills');
  const [resolution, setResolution] = useState<{ won: boolean | null; match_id: string; metrics: Record<string, number> } | null>(null);

  const load = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = nickname.trim();
    if (!name) return;
    setLoading(true);
    setError(null);
    setProfile(null);
    setMatches([]);
    setDist(null);
    setResolution(null);

    try {
      const [prof, matchRows, distData, telem] = await Promise.all([
        fetchProfile(name, 'cs2.faceit'),
        fetchFaceitMatches(name),
        fetchFaceitDistribution(name, distMetric).catch(() => null),
        fetchFaceitTelemetry(name).catch(() => null),
      ]);
      setProfile(prof);
      setMatches(matchRows);
      setDist(distData);
      if (telem) setResolution({ won: telem.won, match_id: telem.match_id, metrics: telem.metrics });
    } catch (err) {
      setError((err as Error).message || 'Failed to load FaceIt data');
    } finally {
      setLoading(false);
    }
  };

  const loadDist = async (metric: string) => {
    if (!profile) return;
    setDistMetric(metric);
    try {
      const d = await fetchFaceitDistribution(profile.username, metric);
      setDist(d);
    } catch {
      setDist(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 24px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 6 }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-head)' }}>FaceIt Lab</span>
          <span style={{
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '3px 8px', background: 'rgba(163,230,53,0.12)', color: 'var(--lime)',
            borderRadius: 4, border: '1px solid rgba(163,230,53,0.3)',
          }}>DEV ONLY</span>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Inspect real FaceIt CS2 data as the app consumes it. No wallets touched.
        </p>
      </div>

      {/* Section 1: Nickname input */}
      <form onSubmit={load} style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
        <input
          className="input"
          style={{ flex: 1, maxWidth: 320 }}
          placeholder="FaceIt nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <button type="submit" className="btn btn-primary" disabled={loading || !nickname.trim()}>
          {loading ? 'Loading…' : 'Load'}
        </button>
      </form>

      {error && (
        <div style={{ color: 'var(--crimson)', fontSize: '0.84rem', marginBottom: 24, padding: '12px 16px', background: 'rgba(255,77,77,0.08)', borderRadius: 8, border: '1px solid rgba(255,77,77,0.2)' }}>
          {error}
        </div>
      )}

      {profile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Section 1 result: profile card */}
          <section>
            <h3 style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, fontFamily: 'var(--font-head)' }}>
              Profile
            </h3>
            <div className="surface" style={{ padding: '18px 20px', borderRadius: 10, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <Stat label="Nickname" value={profile.display_name} />
              <Stat label="FaceIt Elo" value={profile.rating?.toString() ?? '–'} accent />
              <Stat label="Skill level" value={profile.rank_label ?? '–'} />
              <Stat label="Matches" value={profile.total_games.toLocaleString()} />
              <Stat label="Win Rate" value={`${(profile.win_rate * 100).toFixed(1)}%`} />
              {profile.kd != null && <Stat label="Avg K/D" value={profile.kd.toFixed(2)} />}
              <a href={profile.url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '0.78rem', color: 'var(--lime)', alignSelf: 'center', marginLeft: 'auto' }}>
                FaceIt profile →
              </a>
            </div>
          </section>

          {/* Section 2: Recent matches table */}
          {matches.length > 0 && (
            <section>
              <h3 style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, fontFamily: 'var(--font-head)' }}>
                Recent Matches ({matches.length})
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Result</th>
                      <th>Kills</th>
                      <th>Deaths</th>
                      <th>K/D</th>
                      <th>HS%</th>
                      <th>ADR</th>
                      <th>MVPs</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <span style={{ color: m.won === true ? 'var(--pos)' : m.won === false ? 'var(--crimson)' : 'var(--text-muted)', fontWeight: 600 }}>
                            {m.won === true ? 'W' : m.won === false ? 'L' : '–'}
                          </span>
                        </td>
                        <td>{fmt(m.metrics.cs2_kills)}</td>
                        <td>{fmt(m.metrics.cs2_deaths)}</td>
                        <td>{fmt(m.metrics.cs2_kd_ratio)}</td>
                        <td>{fmt(m.metrics.cs2_headshot_pct)}</td>
                        <td>{fmt(m.metrics.cs2_adr)}</td>
                        <td>{fmt(m.metrics.cs2_mvps)}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{timeAgo(m.created_at_ms)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Section 3: Stat distribution */}
          <section>
            <h3 style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, fontFamily: 'var(--font-head)' }}>
              Stat Distribution
              <span style={{ fontSize: '0.65rem', marginLeft: 8, color: 'var(--text-muted)', letterSpacing: 0, textTransform: 'none', fontFamily: 'var(--font-body)' }}>
                — input to matchmaking and solo standards, not pricing
              </span>
            </h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {CS2_METRICS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  className={`chip ${distMetric === m.key ? 'is-active' : ''}`}
                  onClick={() => loadDist(m.key)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {dist && (
              <div className="surface" style={{ padding: '18px 20px', borderRadius: 10 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                  {dist.metric} across {dist.count} recent matches
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <DistBar value={dist.min} max={dist.max} label="Min" />
                  <DistBar value={dist.p25} max={dist.max} label="P25" />
                  <DistBar value={dist.median} max={dist.max} label="Median" />
                  <DistBar value={dist.mean} max={dist.max} label="Mean" />
                  <DistBar value={dist.p75} max={dist.max} label="P75" />
                  <DistBar value={dist.p90} max={dist.max} label="P90" />
                  <DistBar value={dist.max} max={dist.max} label="Max" />
                </div>
              </div>
            )}
          </section>

          {/* Section 4: Simulate resolution */}
          {resolution && (
            <section>
              <h3 style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, fontFamily: 'var(--font-head)' }}>
                Simulate Resolution
                <span style={{ fontSize: '0.65rem', marginLeft: 8, color: 'var(--text-muted)', letterSpacing: 0, textTransform: 'none', fontFamily: 'var(--font-body)' }}>
                  — latest match vs a $10 win_h2h contract · illustrative, no wallet
                </span>
              </h3>
              <div className="surface" style={{ padding: '18px 20px', borderRadius: 10, display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Outcome</div>
                  <div style={{
                    fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-head)',
                    color: resolution.won === true ? 'var(--pos)' : resolution.won === false ? 'var(--crimson)' : 'var(--text-muted)',
                  }}>
                    {resolution.won === true ? 'WON' : resolution.won === false ? 'LOST' : 'UNKNOWN'}
                  </div>
                  {resolution.won !== null && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {resolution.won ? `+${formatCurrency(9.0)} net (90% rake)` : `–${formatCurrency(10)} entry`}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  {Object.entries(resolution.metrics).map(([k, v]) => (
                    <Stat key={k} label={k.replace('cs2_', '')} value={fmt(v)} />
                  ))}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  match {resolution.match_id.slice(-8)}
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: accent ? 'var(--lime)' : '#fff', fontFamily: 'var(--font-head)' }}>{value}</div>
    </div>
  );
}
