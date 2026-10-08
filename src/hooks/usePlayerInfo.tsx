import React, { useState, useCallback } from 'react';
import initalGameState from 'state/InitialGameState';
import { GameState } from 'state/State';

export interface PlayerInfo {
  avatar: string;
  name: string;
  avatarIndex?: number;
  playerId?: string;
}

export interface PlayersInfo {
  numberPlayers: number;
  players: PlayerInfo[];
  roomId?: string;
  playerId?: string; 
  roomStatus: 'waiting' | 'full' | 'closed';
  gameStarted: boolean;
  gameStartedState: GameState,
  isHost: boolean,
  hostLeft: boolean,

  // setters
  setNumberPlayers(number: number): void;
  setPlayers: React.Dispatch<React.SetStateAction<PlayerInfo[]>>;
  setRoomId(id: string): void;
  setPlayerId(id: string): void;
  setRoomStatus(status: 'waiting' | 'full' | 'closed'): void;
  setGameStarted(started: boolean): void;
  setGameStartedState(state: GameState): void;
  setIsHost(isHost: boolean): void;
  sethostLeft(hostLeft: boolean): void,
}

export const initialPlayersInfo: PlayerInfo[] = [...Array(6).keys()].map((_, index) => {
  const randomAvatar = Math.floor(Math.random() * 6) + 1;
  return {
    avatar: `/images/playerAvatars/avatar-${randomAvatar}.png`,
    name: `Player ${index + 1}`,
    avatarIndex: randomAvatar - 1,
    playerId: null,
  };
});

export const createInitialPlayersInfo = (): PlayersInfo => {
  const [numberPlayers, setNumberPlayers] = useState(2);
  const [players, setPlayers] = useState(initialPlayersInfo);
  const [roomId, setRoomId] = useState<string | undefined>(undefined);
  const [playerId, setPlayerId] = useState<string | undefined>(undefined);
  const [roomStatus, setRoomStatus] = useState<'waiting' | 'full' | 'closed'>('waiting');
  const [gameStarted, setGameStarted] = useState(false);
  const [gameStartedState, setGameStartedState] = useState<GameState>(initalGameState);
  const [isHost, setIsHost] = useState(false);
  const [hostLeft, sethostLeft] = useState(false);

  return {
    numberPlayers,
    players,
    roomId,
    playerId,
    roomStatus,
    gameStarted,
    gameStartedState,
    isHost,
    hostLeft,

    setNumberPlayers,
    setPlayers,
    setRoomId,
    setPlayerId,
    setRoomStatus,
    setGameStarted,
    setGameStartedState,
    setIsHost,
    sethostLeft,

  };
};

// Default stub for context
export const PlayerInfoContext = React.createContext<PlayersInfo>({
  numberPlayers: 2,
  players: initialPlayersInfo,
  roomId: undefined,
  roomStatus: 'waiting',
  gameStarted: false,
  gameStartedState: initalGameState,
  isHost: false,
  hostLeft: false,
  setNumberPlayers: () => {},
  setPlayers: () => {},
  setRoomId: () => {},
  setPlayerId: () => {},
  setRoomStatus: () => {},
  setGameStarted: () => {},
  setGameStartedState: () => {},
  setIsHost: () => {},
  sethostLeft: () => {},
});
