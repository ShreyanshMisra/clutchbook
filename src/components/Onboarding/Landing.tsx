import { useState } from 'react';
import { ArrowRight, Check, ShieldCheck, Zap } from 'lucide-react';

interface LandingProps {
  onStart: () => void;
}

// Every US state + DC, for the residency dropdown.
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'District of Columbia', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
  'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
];

// States where real-money skill contests are not offered. Geo-gating the demo
// mirrors the production posture (overview §9.2) — confirm with counsel before
// launch. South Carolina: courts have held that any wager makes skill irrelevant.
const EXCLUDED_STATES = new Set<string>([
  'Arizona', 'Arkansas', 'Connecticut', 'Delaware', 'Florida', 'Indiana',
  'Louisiana', 'Maryland', 'Minnesota', 'Montana', 'South Carolina',
  'South Dakota', 'Tennessee', 'Wyoming',
]);

/**
 * Mock-auth landing. No real auth in the demo — a brand wall plus an eligibility
 * gate (18+ confirmation and a non-excluded state of residence) that must pass
 * before Start unlocks. This is the demo's stand-in for the production
 * age-verification + geo-gating controls.
 */
export function Landing({ onStart }: LandingProps) {
  const [is18, setIs18] = useState(false);
  const [stateName, setStateName] = useState('');

  const stateExcluded = stateName !== '' && EXCLUDED_STATES.has(stateName);
  const eligible = is18 && stateName !== '' && !stateExcluded;

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
          Head-to-head skill matches on the games you already play. Stake an entry,
          get matched in your rating band, and the winner takes the pot — settled
          automatically against your verified results.
        </p>

        {/* Eligibility gate */}
        <div
          className="surface"
          style={{ width: '100%', padding: 18, marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}
        >
          <div className="text-faint uppercase-head" style={{ fontSize: '0.62rem' }}>
            Eligibility check
          </div>

          {/* 18+ confirmation */}
          <button
            type="button"
            role="checkbox"
            aria-checked={is18}
            onClick={() => setIs18((v) => !v)}
            className="flex items-center gap-3"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span
              aria-hidden
              className="flex items-center justify-center"
              style={{
                width: 22,
                height: 22,
                flexShrink: 0,
                borderRadius: 6,
                border: `1px solid ${is18 ? 'var(--lime)' : 'var(--border-strong)'}`,
                background: is18 ? 'var(--lime)' : 'transparent',
              }}
            >
              {is18 && <Check size={15} strokeWidth={3} color="#0a0b0f" />}
            </span>
            <span className="text-muted" style={{ fontSize: '0.86rem' }}>
              Yes — I confirm I am <span className="text-pos">18 or older</span>.
            </span>
          </button>

          {/* State of residence */}
          <label style={{ display: 'block' }}>
            <span className="text-faint" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 6 }}>
              What state do you reside in?
            </span>
            <select
              className="input"
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="" disabled>
                Select your state
              </option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          {stateExcluded && (
            <span className="text-crimson" style={{ fontSize: '0.78rem', lineHeight: 1.4 }}>
              money match isn’t available in {stateName} yet. We only operate where
              peer-to-peer skill contests are permitted.
            </span>
          )}
        </div>

        <button
          type="button"
          className={`btn ${eligible ? 'btn-primary' : ''}`}
          onClick={onStart}
          disabled={!eligible}
          aria-disabled={!eligible}
          style={{
            marginTop: 20,
            padding: '13px 28px',
            fontSize: '1rem',
            gap: 10,
            width: '100%',
            justifyContent: 'center',
            ...(eligible ? {} : { opacity: 0.5, cursor: 'not-allowed' }),
          }}
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
