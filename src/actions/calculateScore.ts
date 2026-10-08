import delay from 'delay';
import Card from 'model/Card';
import { GameState, Player } from 'state/State';

export default function calculateScore(isHost, isMultiplayer, currentPlayers: Player[]) {
  return async (dispatch, getState) => {

    if (!isHost && isMultiplayer) {
      dispatch({
        type: 'CALCULATE_SCORE',
        payload: { },
      });
      return;
    }


    let sum = (n: Card[]) => {
      return n.reduce((points, card) => points + card.points, 0);
    };

    currentPlayers.forEach((player, index) => {
      let negatives = player.deck.filter(
        (card) => card.color === 'penalty' || card.color === 'dragon'
      );
      let positives = player.deck.filter(
        (card) =>
          card.color !== 'penalty' &&
          card.color !== 'dragon' &&
          card.specialEffect !== 'Fairy'
      );
      let fairies = player.deck.filter(
        (card) => card.specialEffect === 'Fairy'
      ).length;

      let fairySum = 0;
      if (fairies >= 1) {
        fairySum = Math.pow(fairies, 2);
      }

      let total = sum(positives) - sum(negatives) + fairySum;
      player.points = total;

      dispatch({
        type: 'savePoints',
        payload: {
          player: index,
          points: total,
        },
      });
    });

    let sortedPlayers = currentPlayers.sort((a, b) =>
      a.points < b.points ? 1 : -1
    );
    let highestPlayer = sortedPlayers[0];

    dispatch({
      type: 'updateHighestScorePlayer',
      payload: {
        highestPlayer,
      },
    });
  };
}
