import delay from 'delay';
import { PlayersInfo } from 'hooks/usePlayerInfo';
import { GameState } from 'state/State';
import { lastSync } from 'state/sync';

export default function setupGame(isMultiplayer: boolean, playerInfo: PlayersInfo) {
  return async (dispatch, getState) => {
    let state: GameState = getState();

    if ((playerInfo.isHost && isMultiplayer) || !isMultiplayer) {
      dispatch({
        type: 'setup',
        payload: {
          ...playerInfo,
        },
        meta: { remote: true }, // no need to send to others, host is the source of truth 
      });

    } else {
      // load game state from host
      dispatch({
        type: 'loadGameState',
        payload: {
          ...playerInfo.gameStartedState,
        },
        meta: { remote: true }, // no need to send to others, all got from host
      });

      // The host may have sent newer updates while the board was loading
      if (lastSync.current) {
        dispatch({ type: 'loadGameState', payload: lastSync.current.payload.state });
      }
    }
  };
}
