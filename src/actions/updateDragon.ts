export default function updateDragon(
  isMultiplayer,
  isHost,
  slotIndex?,
  dragonIndex?
) {
  return async (dispatch, getState) => {
    if (dragonIndex !== undefined) {
      if (!isHost && isMultiplayer) {
        dispatch({
          type: 'UPDATE_DRAGON',
          payload: {
            slotIndex: undefined,
            dragonIndex: dragonIndex,
          },
        });
        return;
      }

      dispatch({
        type: 'updateDragonIndex',
        payload: {
            slotIndex: undefined,
            dragonIndex: dragonIndex,
        },
      });
    }

    if (slotIndex !== undefined) {
      if (!isHost && isMultiplayer) {
        dispatch({
          type: 'UPDATE_DRAGON',
          payload: {
            slotIndex: slotIndex,
            dragonIndex: undefined
          },
        });
        return;
      }
      dispatch({
        type: 'updateDragonSlot',
        payload: {
            slotIndex: slotIndex,
            dragonIndex: undefined,
        },
      });
    }
  };
}
