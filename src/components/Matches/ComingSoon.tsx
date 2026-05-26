import { Lock } from 'lucide-react';

const GAMES = [
  { name: 'League of Legends', tag: 'MOBA', color: '#1e9de3' },
  { name: 'Dota 2', tag: 'MOBA', color: '#c23c2a' },
  { name: 'Counter-Strike 2', tag: 'FPS', color: '#e0a13a' },
  { name: 'Rocket League', tag: 'Sports', color: '#3a7be0' },
];

export function ComingSoon() {
  return (
    <section style={{ marginTop: 40 }}>
      <h3 className="section-title" style={{ marginBottom: 4 }}>More Arenas</h3>
      <p className="text-muted" style={{ fontSize: '0.86rem', marginBottom: 16 }}>
        Additional titles are coming to Clutchbook. Chess is live now.
      </p>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {GAMES.map((g) => (
          <div key={g.name} className="coming-tile" aria-disabled>
            <span className="lock-badge">
              <Lock size={10} /> Coming Soon
            </span>
            <span
              aria-hidden
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: g.color,
                opacity: 0.7,
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'var(--font-head)',
                fontWeight: 700,
                color: '#0a0b0f',
              }}
            >
              {g.name[0]}
            </span>
            <div className="font-head" style={{ fontSize: '1.02rem', fontWeight: 600 }}>
              {g.name}
            </div>
            <div className="text-faint uppercase-head" style={{ fontSize: '0.68rem' }}>
              {g.tag}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
