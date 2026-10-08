import { useContext } from 'react';
import { PlayerInfoContext } from './usePlayerInfo';

export const useIsMultiplayer = () => {
  const playerInfo = useContext(PlayerInfoContext);

  if (playerInfo.roomId !== undefined) {
    return true;
  }

  return false;
};
