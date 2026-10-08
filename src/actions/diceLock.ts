export default function lockDice(isMultiplayer, isHost, isLocked, index) {
  return async (dispatch, getState) => {

    if (!isHost && isMultiplayer) {
      dispatch({
        type: 'LOCK_DICE',
        payload: {
            isLocked: isLocked,
            index: index
        },
      });
      return;
    }

    if(isLocked) {
        dispatch({type: 'unlockDice', payload: index})
    } else {
        dispatch({type: 'lockDice', payload: index})
    }
 }
}
