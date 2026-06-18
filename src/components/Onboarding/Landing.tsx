import { ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface LandingProps {
  onStart: () => void;
}

/**
 * Mock-auth landing. No real auth in the demo — just a brand wall and a Start
 * button that drops you into the app, where you link individual game accounts.
 */
export function Landing({ onStart }: LandingProps) {
  return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: '100vh', padding: 24 }}>
      <div className="fade-in flex flex-col items-center" style={{ width: '100%', maxWidth: 460, textAlign: 'center' }}>
        <span aria-hidden className="brand-glyph" style={{ fontSize: '3.5rem', lineHeight: 1, marginBottom: 8 }}>
          ⟁
        </span>
        <h1 className="uppercase-head" style={{ fontWeight: 700, fontSize: '3rem', letterSpacing: '0.04em', lineHeight: 1 }}>
          money <span className="text-lime">match</span>
        </h1>
        <p className="text-muted" style={{ marginTop: 14, lineHeight: 1.5, maxWidth: 380 }}>
          Wager on your own skill. Take a personalized contract on the games you
          play, and we settle it automatically against your verified results.
        </p>

        <button
          type="button"
          className="btn btn-primary"
          onClick={onStart}
          style={{ marginTop: 28, padding: '13px 28px', fontSize: '1rem', gap: 10 }}
        >
          Start <ArrowRight size={18} />
        </button>

        <div className="flex items-center justify-center gap-5 text-faint" style={{ marginTop: 24, fontSize: '0.74rem' }}>
          <span className="flex items-center gap-1"><Zap size={13} /> Play money only</span>
          <span className="flex items-center gap-1"><ShieldCheck size={13} /> No deposits</span>
        </div>
      </div>
    </div>
  );
}
