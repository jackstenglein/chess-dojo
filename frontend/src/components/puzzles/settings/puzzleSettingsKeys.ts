import { CoordinateSize } from '@/board/pgn/boardTools/underboard/settings/viewerSettingsConstants';

export const RATED_KEY = 'puzzles.rated';
export const SHOW_TIMER_KEY = 'puzzles.showTimer';
export const SHOW_RATING_KEY = 'puzzles.showRating';
export const SHOW_STREAK_KEY = 'puzzles.showStreak';
export const DIFFICULTY_KEY = 'puzzles.difficulty';
export const THEME_KEY = 'puzzles.theme';
export const CORRECT_SOUND_KEY = 'puzzles.correctSound';
export const INCORRECT_SOUND_KEY = 'puzzles.incorrectSound';
/** Which sound plays when a puzzle is solved. See puzzleSounds.ts. */
export const SOLVED_SOUND_KEY = 'puzzles.solvedSound';

/** The board coordinates are large on the puzzle pages, until someone chooses otherwise. */
export const PUZZLE_COORDINATE_SIZE = CoordinateSize.Large;
