import { PlayersInfo } from 'hooks/usePlayerInfo';
import { GameState } from 'state/State';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from 'firestore/firebase';

export default function startGame(
  isMultiplayer: boolean,
  playerInfo: PlayersInfo
) {
  return async (dispatch, getState) => {
    let state: GameState = getState();

    if ((playerInfo.isHost && isMultiplayer) || !isMultiplayer) {
      console.log(`🎲 🎲 🎲 ${state.dices.length}`);
      updateDoc(doc(db, `rooms/${playerInfo.roomId}`), { gameStarted: true });
      dispatch({
        type: 'GAME_START',
        payload: {
          ...state,
        },
        meta: { broadcast: true },
      });
    }
  };
}
