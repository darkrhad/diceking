import delay from 'delay';
import { CitizenCardSlot, CityCardSlot, Dice, GameState, Player } from 'state/State';
import calculateScore from './calculateScore';
import endOfGame from './endOfGame';
import replaceSlots from './replaceSlots';
import takePenaltyCard from './takePenaltyCard';
import Card from 'model/Card';

export default function endTurn(
  hasTakenDragon: boolean,
  isMultiplayer: boolean,
  isHost: boolean,
  citizenCardSlots?: CitizenCardSlot[],
  dices?: Dice[],
  citizenCardDeck?: Card[],
  penaltyCardDeck?: Card[],
  discardDeck?: Card[],
  cityCardSlots?: CityCardSlot[],
  player?: Player[],
  playerTurn?: number,
) {
  return async (dispatch, getState) => {
    if (citizenCardSlots == undefined) {
      let state: GameState = getState();
      citizenCardSlots = state.citizenCardSlots;
      dices = state.dices;
      citizenCardDeck = state.citizenCardDeck;
      penaltyCardDeck = state.penaltyCardDeck;
      discardDeck = state.discardDeck;
      cityCardSlots = state.cityCardSlots;
      player = state.player;
      playerTurn = state.playerTurn;
    }

    if (!isHost && isMultiplayer) {
      dispatch({
        type: 'END_TURN',
        payload: { hasTakenDragon },
      });
      return;
    }

    let diceRolls = 0;
    let emptySlots =
      citizenCardSlots.filter((slot) => slot.card === null).length > 0;

    dispatch({
      type: 'setDiceRolls',
      payload: 0,
    });

    if (emptySlots) {
      await dispatch(replaceSlots(citizenCardSlots, citizenCardDeck));
    } else {
      await dispatch(takePenaltyCard(citizenCardDeck, citizenCardSlots, penaltyCardDeck, discardDeck));
    }

    let currentPlayerTopCard =
      player[playerTurn].deck[0]?.specialEffect;
    let nextPlayer = playerTurn;
    if (currentPlayerTopCard === 'Sorcerer') {
      if (hasTakenDragon === true) {
        nextPlayer = (playerTurn + 1) % player.length;
      }
    } else {
      nextPlayer = (playerTurn + 1) % player.length;
    }

    let nextPlayerTopCard = player[nextPlayer].deck[0]?.specialEffect;
    for (let i = 0; i < citizenCardSlots.length; i++) {
      citizenCardSlots[i].isHighlighted = false;
    }

    if (nextPlayerTopCard === 'Arrogant') {
      diceRolls = 4;
    } else {
      diceRolls = 3;
    }

    await dispatch({
      type: 'saveCitizenSlots',
      payload: {
        citizenCardSlots: citizenCardSlots,
      },
    });

    dispatch(calculateScore(isHost, isMultiplayer, player));

    dispatch({
      type: 'savePlayerTurn',
      payload: nextPlayer 
    });

    dispatch({
      type: 'setDiceRolls',
      payload: diceRolls,
    });

    dispatch({
      type: 'saveEndTurnEnabled',
      payload: true,
    });

    dices.forEach((die, index) => {
      dispatch({
        type: 'unlockDice',
        payload: index,
      });
    });
 
    dispatch(endOfGame(penaltyCardDeck,citizenCardDeck, cityCardSlots));
  };
}
