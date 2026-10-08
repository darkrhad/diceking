import rollDice from 'actions/rollDice';
import lockDice from 'actions/diceLock';
import updateDragon from 'actions/updateDragon';
import takeCard from 'actions/takeCard';
import endTurn from 'actions/endTurn';
import { GameState } from './State';
import { moveCount, ONCE_INTENTS } from './sync';

// What a player asks the game to do. Guests send these to the host; the host
// checks them and runs the matching action. The host's own clicks go through
// the same check.
export type Intent =
  | { type: 'ROLL_DICE'; payload?: {} }
  | { type: 'LOCK_DICE'; payload: { index: number; isLocked: boolean } }
  | { type: 'UPDATE_DRAGON'; payload: { slotIndex?: number; dragonIndex?: number } }
  | { type: 'TAKE_CARD'; payload: { index: number } }
  | { type: 'END_TURN'; payload: { hasTakenDragon?: boolean } };

// The state the board last rendered, for checking intents that arrive over
// the network outside of React.
export const gameStateRef: { current: GameState | null } = { current: null };

const isIndex = (value: any, length: number) =>
  Number.isInteger(value) && value >= 0 && value < length;

// playerId is the sender (the connection's id for guests), or undefined in a
// single-player game, where whoever clicks is the current player.
export function isIntentAllowed(
  state: GameState | null,
  intent: Intent,
  playerId?: string
): boolean {
  if (!state || state.isGameOver || state.player.length === 0) return false;
  if (playerId !== undefined && state.player[state.playerTurn]?.playerId !== playerId) {
    return false;
  }

  const payload: any = intent.payload ?? {};
  const isDragonSlot = (index: number) => {
    const slot = state.citizenCardSlots[index];
    return slot?.isHighlighted && slot.card?.specialEffect === 'Dragon';
  };

  switch (intent.type) {
    case 'ROLL_DICE':
      return state.diceTurns > 0 && state.endTurnEnabled;

    case 'LOCK_DICE':
      return (
        isIndex(payload.index, state.dices.length) &&
        typeof payload.isLocked === 'boolean' &&
        // Dice can only be locked after the first roll
        state.diceTurns !== state.initalDiceRolls
      );

    case 'UPDATE_DRAGON':
      if (payload.slotIndex !== undefined) {
        return isIndex(payload.slotIndex, state.citizenCardSlots.length) && isDragonSlot(payload.slotIndex);
      }
      return (
        isIndex(payload.dragonIndex, state.player.length) &&
        payload.dragonIndex !== state.playerTurn
      );

    case 'TAKE_CARD': {
      const slot = state.citizenCardSlots[payload.index];
      if (!isIndex(payload.index, state.citizenCardSlots.length) || !state.endTurnEnabled) return false;
      if (!slot.isHighlighted || !slot.card) return false;
      if (slot.card.specialEffect === 'Dragon') {
        // The dragon goes to the player picked in the popup
        return (
          state.dragonSlotIndex === payload.index &&
          isIndex(state.dragonIndex, state.player.length) &&
          state.dragonIndex !== state.playerTurn
        );
      }
      return true;
    }

    case 'END_TURN':
      return state.endTurnEnabled;
  }
  return false;
}

function intentAction(intent: Intent, isMultiplayer: boolean) {
  const payload: any = intent.payload ?? {};
  switch (intent.type) {
    case 'ROLL_DICE':
      return rollDice(isMultiplayer, true);
    case 'LOCK_DICE':
      return lockDice(isMultiplayer, true, payload.isLocked, payload.index);
    case 'UPDATE_DRAGON':
      return updateDragon(isMultiplayer, true, payload.slotIndex, payload.dragonIndex);
    case 'TAKE_CARD':
      return takeCard(payload.index, isMultiplayer, true);
    case 'END_TURN':
      return endTurn(payload.hasTakenDragon === true, isMultiplayer, true);
  }
}

let busy = false;

// Host or single player: runs an intent if it's allowed and no other action
// is still running (a take card waits for its animations and the end of the
// turn). Returns whether it ran.
export async function runIntent(
  dispatch: (action: any) => any,
  intent: Intent,
  isMultiplayer: boolean,
  playerId?: string
): Promise<boolean> {
  if (busy || !isIntentAllowed(gameStateRef.current, intent, playerId)) {
    console.log('[Game] Ignored', intent.type, 'from', playerId ?? 'local player');
    return false;
  }
  busy = true;
  if (ONCE_INTENTS.includes(intent.type)) moveCount.current += 1;
  try {
    await dispatch(intentAction(intent, isMultiplayer));
  } finally {
    busy = false;
  }
  return true;
}
