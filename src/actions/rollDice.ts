import { Dice, DiceColors, GameState } from 'state/State';
import fullfillCitizenCardCondition from './fullfillCitizenCardCondition';

export default function rollDice( isMultiplayer: boolean, isHost: boolean) {
  return async (dispatch, getState) => {
    let state: GameState = getState();
    let currentDices = state.dices;
    let currentTurns = state.diceTurns;
    var newTurns;

    if (!isHost && isMultiplayer) {
      dispatch({
        type: 'ROLL_DICE',
        payload: {},
      });
      return;
    }

    if (currentTurns > 0) {
      newTurns = currentTurns - 1;
    } else {
      newTurns = 3;
    }
    let newDices: Dice[] = currentDices.map((die, index) => {
      let locked = die.isLocked;
      if (die.isLocked !== false) {
        return {
          ...die,
        };
      } else {
        let side = Math.floor(Math.random() * 6);

        let color = state.gameInfo.dices[index].sides[side].color;
        let number = state.gameInfo.dices[index].sides[side].number;
        let colors = {
          R: DiceColors.Red,
          B: DiceColors.Blue,
          G: DiceColors.Green,
        };

        return {
          isLocked: locked,
          color: colors[color],
          number: number,
        };
      }
    });

    // if (newTurns === 1) {
    //   newDices[0].number = 1
    //   newDices[1].number = 4
    //   newDices[2].number = 4
    //   newDices[3].number = 4
    //   newDices[4].number = 6
    //   newDices[5].number = 1
    // }

    dispatch({
      type: 'saveDices',
      payload: {
        dices: newDices,
        diceTurns: newTurns,
      },
    });

    dispatch(fullfillCitizenCardCondition(newDices,state.cityCardSlots,state.citizenCardSlots));
  };
}
