import Card from 'model/Card';
import { CityCardSlot, GameState } from 'state/State';

export default function endOfGame(penaltyCardDeck: Card[], citizenCardDeck: Card[], cityCardSlots: CityCardSlot[]) {
  return (dispatch, getState) => {

    // The game ends when the citizen pile, the penalty pile or any one of
    // the village stacks runs out
    let reason: string | undefined;
    if (citizenCardDeck.length === 0) {
      reason = 'The citizen pile is empty';
    } else if (penaltyCardDeck.length === 0) {
      reason = 'The penalty pile is empty';
    } else if (cityCardSlots.some((slot) => slot.cards.length === 0)) {
      reason = 'A village stack is empty';
    }

    if (reason) {
      dispatch({
        type: 'endGame',
        payload: true,
        reason,
      });
    }
  };
}
