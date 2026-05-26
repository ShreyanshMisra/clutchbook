import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import type { BetMarket, BetTarget, LiveGame, OddsFormat } from '../../types';
import type { SelectionInput } from '../../hooks/useBetSlip';
import { OddsButton } from './OddsButton';
import { LiveBadge } from './LiveBadge';
import { Badge } from '../UI/Badge';
import { Sparkline } from '../UI/Sparkline';

interface MatchCardProps {
  game: LiveGame;
  format: OddsFormat;
  addSelection: (input: SelectionInput) => void;
  isSelected: (gameId: string, market: BetMarket, target: BetTarget) => boolean;
}

const TC_VARIANT: Record<string, string> = {
  bullet: 'bullet',
  blitz: 'blitz',
  rapid: 'rapid',
  classical: 'classical',
};

function MarketSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      <button
        type="button"
        className="flex items-center justify-between w-full"
        style={{ padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="uppercase-head" style={{ fontSize: '0.78rem', fontWeight: 500 }}>
          {title}
        </span>
        <ChevronDown
          size={16}
          style={{ transition: 'transform 0.18s ease', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {open && <div className="fade-in" style={{ paddingBottom: 12 }}>{children}</div>}
    </div>
  );
}

export function MatchCard({ game, format, addSelection, isSelected }: MatchCardProps) {
  const { markets } = game;
  const whiteLabel = `${game.player_white}${game.rating_white ? ` [${game.rating_white}]` : ''}`;
  const blackLabel = `${game.player_black}${game.rating_black ? ` [${game.rating_black}]` : ''}`;
  const gameLabel = `${game.player_white} vs ${game.player_black}`;

  // Track white's decimal odds over polls for the movement sparkline.
  const [history, setHistory] = useState<number[]>([markets.match_winner.player_a.decimal]);
  const lastDecimal = useRef(markets.match_winner.player_a.decimal);
  useEffect(() => {
    const d = markets.match_winner.player_a.decimal;
    if (d !== lastDecimal.current) {
      lastDecimal.current = d;
      setHistory((h) => [...h.slice(-19), d]);
    }
  }, [markets.match_winner.player_a.decimal]);

  const select = (
    market: BetMarket,
    target: BetTarget,
    selectionLabel: string,
    american: number,
    decimal: number,
  ) => {
    addSelection({
      gameId: game.game_id,
      gameLabel,
      market,
      selectionLabel,
      americanOdds: american,
      decimalOdds: decimal,
      wager: 10,
      gameUrl: game.game_url,
      target,
    });
  };

  const mw = markets.match_winner;
  const tm = markets.total_moves;
  const rt = markets.result_type;

  return (
    <div className="surface-card" style={{ padding: 16 }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <LiveBadge />
        <div className="flex items-center gap-2">
          <Badge variant={TC_VARIANT[game.time_control] ?? 'blitz'}>{game.time_control}</Badge>
          <Badge variant="phase">{game.phase}</Badge>
        </div>
      </div>

      {/* Players */}
      <div className="flex items-center justify-between gap-3" style={{ marginBottom: 4 }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span aria-hidden style={{ width: 9, height: 9, borderRadius: '50%', background: '#f1f3f6', border: '1px solid #555', flexShrink: 0 }} />
            <span className="font-head" style={{ fontSize: '1.15rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {whiteLabel}
            </span>
          </div>
          <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
            <span aria-hidden style={{ width: 9, height: 9, borderRadius: '50%', background: '#0a0b0f', border: '1px solid #555', flexShrink: 0 }} />
            <span className="font-head" style={{ fontSize: '1.15rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {blackLabel}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1" style={{ flexShrink: 0 }}>
          <Sparkline data={history} />
          <span className="text-faint tabular" style={{ fontSize: '0.72rem' }}>
            {game.move_count != null ? `${game.move_count} ${game.move_count === 1 ? 'move' : 'moves'}` : '—'}
          </span>
        </div>
      </div>

      {/* Markets */}
      <div style={{ marginTop: 8 }}>
        <MarketSection title="Match Winner" defaultOpen>
          <div className="grid grid-cols-2 gap-2">
            <OddsButton
              label={`${game.player_white} to win`}
              american={mw.player_a.american}
              decimal={mw.player_a.decimal}
              format={format}
              active={isSelected(game.game_id, 'match_winner', { side: 'white' })}
              onClick={() => select('match_winner', { side: 'white' }, `${game.player_white} to win`, mw.player_a.american, mw.player_a.decimal)}
            />
            <OddsButton
              label={`${game.player_black} to win`}
              american={mw.player_b.american}
              decimal={mw.player_b.decimal}
              format={format}
              active={isSelected(game.game_id, 'match_winner', { side: 'black' })}
              onClick={() => select('match_winner', { side: 'black' }, `${game.player_black} to win`, mw.player_b.american, mw.player_b.decimal)}
            />
          </div>
        </MarketSection>

        <MarketSection title="Total Moves O/U">
          <div className="grid grid-cols-2 gap-2">
            <OddsButton
              label={`Over ${tm.line}`}
              american={tm.over_american}
              decimal={tm.over_decimal}
              format={format}
              active={isSelected(game.game_id, 'total_moves_over', { line: tm.line })}
              onClick={() => select('total_moves_over', { line: tm.line }, `Over ${tm.line} moves`, tm.over_american, tm.over_decimal)}
            />
            <OddsButton
              label={`Under ${tm.line}`}
              american={tm.under_american}
              decimal={tm.under_decimal}
              format={format}
              active={isSelected(game.game_id, 'total_moves_under', { line: tm.line })}
              onClick={() => select('total_moves_under', { line: tm.line }, `Under ${tm.line} moves`, tm.under_american, tm.under_decimal)}
            />
          </div>
        </MarketSection>

        <MarketSection title="Result Type">
          <div className="grid grid-cols-3 gap-2">
            <OddsButton
              label="Checkmate"
              american={rt.checkmate.american}
              decimal={rt.checkmate.decimal}
              format={format}
              active={isSelected(game.game_id, 'result_checkmate', { result: 'checkmate' })}
              onClick={() => select('result_checkmate', { result: 'checkmate' }, 'Win by checkmate', rt.checkmate.american, rt.checkmate.decimal)}
            />
            <OddsButton
              label="Resignation"
              american={rt.resignation.american}
              decimal={rt.resignation.decimal}
              format={format}
              active={isSelected(game.game_id, 'result_resignation', { result: 'resignation' })}
              onClick={() => select('result_resignation', { result: 'resignation' }, 'Win by resignation', rt.resignation.american, rt.resignation.decimal)}
            />
            <OddsButton
              label="Draw"
              american={rt.draw.american}
              decimal={rt.draw.decimal}
              format={format}
              active={isSelected(game.game_id, 'result_draw', { result: 'draw' })}
              onClick={() => select('result_draw', { result: 'draw' }, 'Draw', rt.draw.american, rt.draw.decimal)}
            />
          </div>
        </MarketSection>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 2 }}>
        <a
          href={game.game_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-faint"
          style={{ fontSize: '0.74rem', textDecoration: 'none', width: 'fit-content' }}
        >
          <ExternalLink size={12} /> Watch on Lichess
        </a>
      </div>
    </div>
  );
}
