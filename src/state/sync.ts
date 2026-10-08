import { GameState } from './State';

// The host is the only one running the game. After every change it sends the
// whole shared state (SYNC_STATE) and guests replace theirs with it, so a
// guest that missed or misapplied something is right again on the next
// update.

export interface SyncMessage {
  type: 'SYNC_STATE';
  payload: { seq: number; move: number; state: Partial<GameState> };
}

// Fields every screen keeps for itself: the card data (each one loads it)
// and its own dragon popup. Card flights are in animCardParams, which guests
// play on their own screen.
const LOCAL_FIELDS: (keyof GameState)[] = ['gameInfo', 'isDragonPopUp'];

export function sharedState(state: GameState): Partial<GameState> {
  const shared = { ...state };
  LOCAL_FIELDS.forEach((field) => delete shared[field]);
  return shared;
}

// Host: the number of the last update sent. Guest: of the last one applied,
// so an update that arrives late is never applied over a newer one.
export const syncSeq = { current: 0 };

// Host: how many rolls, take cards and end turns have run. Guest: the count
// in the last update. A guest sends it with each of these moves, and the host
// refuses the move if another one ran since the guest's board was drawn (the
// second click of a fast double click). Counted per move, not per update, as
// one move can send several updates.
export const moveCount = { current: 0 };

// Host: the last update sent, resent to a guest whose move was refused.
// Guest: the newest update, kept until the board is ready to apply it.
export const lastSync: { current: SyncMessage | null } = { current: null };

// Guest: called on every update from the host, including a resend after a
// refused move, so the board knows its move was answered.
export const hostAnswerListeners = new Set<() => void>();

// Moves that must not run twice from one view of the board
export const ONCE_INTENTS = ['ROLL_DICE', 'TAKE_CARD', 'END_TURN'];
