import { CalendarClock } from 'lucide-react';
import { ComingSoon } from '../Matches/ComingSoon';

export function Upcoming() {
  return (
    <div className="fade-in">
      <div style={{ marginBottom: 16 }}>
        <h2 className="section-title" style={{ fontSize: '1.4rem' }}>Upcoming</h2>
        <p className="text-muted" style={{ fontSize: '0.86rem' }}>
          Pre-match markets, before the first move.
        </p>
      </div>

      <div className="state-panel">
        <span className="state-icon">
          <CalendarClock size={24} />
        </span>
        <h3 className="font-head" style={{ fontSize: '1.1rem' }}>No upcoming matches scheduled</h3>
        <p className="text-muted" style={{ fontSize: '0.88rem', maxWidth: 420 }}>
          Clutchbook will list pre-match markets here when they become available. Live
          chess markets are open now under{' '}
          <span className="text-lime">Live Now</span>.
        </p>
      </div>

      <ComingSoon />
    </div>
  );
}
