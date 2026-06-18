// Display-only skill-contract ideas per game, used for the blurred "preview"
// state in the Catalog (a game you haven't linked / that's coming soon). These
// are illustrative — real contracts are priced by the engine once a game links.

export interface SampleContract {
  title: string;
  detail: string;
  multiplier: number; // decimal, for the teaser line only
}

export const SAMPLE_CONTRACTS: Record<string, SampleContract[]> = {
  'chess.lichess': [
    { title: 'Win your next blitz game', detail: 'Take your next rated blitz game.', multiplier: 1.85 },
    { title: 'Win in under 30 moves', detail: 'Win your next game inside 30 moves.', multiplier: 3.2 },
    { title: 'Win 3 of your next 5', detail: 'Win at least 3 of the next 5 rated games.', multiplier: 2.1 },
    { title: 'Win-rate over 55%', detail: 'Across your next 10 games.', multiplier: 2.6 },
  ],
  'cs2.steam': [
    { title: 'Win your next match', detail: 'Take your next competitive match.', multiplier: 1.9 },
    { title: 'Top-frag your team', detail: 'Lead your team in kills next match.', multiplier: 2.8 },
    { title: '1.2+ K/D over 3 matches', detail: 'Keep a 1.2 K/D across your next 3.', multiplier: 2.4 },
    { title: 'Win 4 of your next 5', detail: 'Win 4 of the next 5 competitive games.', multiplier: 3.5 },
  ],
  'clashroyale.supercell': [
    { title: 'Win your next ladder match', detail: 'Take your next Path of Legends game.', multiplier: 1.8 },
    { title: 'Three-crown your next win', detail: 'Win your next match with 3 crowns.', multiplier: 3.0 },
    { title: 'Reach a 3-win streak', detail: 'Win 3 ladder games in a row.', multiplier: 2.7 },
    { title: 'Win a Classic Challenge', detail: 'Hit 12 wins in a Classic Challenge.', multiplier: 5.0 },
  ],
  'rocketleague.psyonix': [
    { title: 'Win your next ranked match', detail: 'Take your next ranked game.', multiplier: 1.85 },
    { title: 'Score 3+ goals', detail: 'Score at least 3 goals in a match.', multiplier: 2.9 },
    { title: 'Earn MVP next game', detail: 'Finish as MVP in your next win.', multiplier: 2.5 },
    { title: 'Win 4 of your next 5', detail: 'Win 4 of the next 5 ranked games.', multiplier: 3.4 },
  ],
};
