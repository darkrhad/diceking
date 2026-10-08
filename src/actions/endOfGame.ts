import Card from 'model/Card';
import { CityCardSlot, GameState } from 'state/State';

export default function endOfGame(penaltyCardDeck: Card[], citizenCardDeck: Card[], cityCardSlots: CityCardSlot[]) {
  return (dispatch, getState) => {

    let emptyCitySlots = false;
    let isPenaltyEmpty = penaltyCardDeck.length === 0 ? true : false;
    let isCitizenEmpty = citizenCardDeck.length === 0 ? true : false;
    cityCardSlots.forEach((slot) =>
      slot.cards.length === 0
        ? (emptyCitySlots = true)
        : (emptyCitySlots = false)
    );

    let anyEmpty =
      [emptyCitySlots, isPenaltyEmpty, isCitizenEmpty].filter(
        (isEmpty) => isEmpty === true
      ).length >= 1
        ? true
        : false;

    if (anyEmpty === true) {
      dispatch({
        type: 'endGame',
        payload: true,
      });
    }
  };
}
