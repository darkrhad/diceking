import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { PlayerInfo, PlayerInfoContext } from 'hooks/usePlayerInfo';
import { gameDispatchRef } from 'pages/PlayGame';

import { DataChannelSocket } from './../firestore/DataChannelSocket';
import { setupGuestPeerWithFirestore } from './../firestore/setupGuestPeerWithFirestore';
import { setupHostPeersWithFirestore } from './../firestore/setupHostPeersWithFirestore';

import { markRoomInactiveOnUnload } from 'firestore/deleteRoom';
import { runIntent } from 'state/intents';
import { hostAnswerListeners, lastSync, moveCount, ONCE_INTENTS, syncSeq } from 'state/sync';

export interface NetworkContextType {
  send: (action: any) => void;
  leaveRoom: () => Promise<void>;
  messages: any[];
}

export const NetworkContext = createContext<NetworkContextType>({
  send: () => {},
  leaveRoom: async () => {},
  messages: [],
});

interface NetworkProviderProps {
  children: React.ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({
  children,
}) => {
  const {
    roomId,
    playerId,
    gameStarted,
    players,
    setPlayers,
    setNumberPlayers,
    setGameStarted,
    setGameStartedState,
    isHost,
    sethostLeft,
  } = useContext(PlayerInfoContext);

  // Messages from peers
  const [messages, setMessages] = useState<any[]>([]);

  // Guests' connections to host (only for host)
  const guestConnectionsRef = useRef<Map<string, DataChannelSocket>>(new Map());

  // Guest's single connection to host (only for guest)
  const guestSocketRef = useRef<DataChannelSocket | null>(null);

  // Message queue for sending when connection is not ready
  const sendQueueRef = useRef<any[]>([]);

  // Closes the current room connection (host: also deletes the room)
  const teardownRef = useRef<(() => void | Promise<void>) | null>(null);

  // Set once the guest handled "host left" (or left on its own), so the
  // HOST_LEAVE message, the room doc watch and the channel closing don't
  // each show the popup.
  const hostLeftHandledRef = useRef(false);

  const notifyHostLeft = () => {
    if (hostLeftHandledRef.current) return;
    hostLeftHandledRef.current = true;
    sethostLeft(true);
  };

  // Host: drops a guest from the player list and tells the remaining guests.
  // peerId is the connection's id, never something taken from a message.
  const removePlayer = (peerId: string) => {
    setPlayers((prevPlayers) => {
      const newPlayers = prevPlayers.filter((p) => p.playerId !== peerId);
      if (newPlayers.length === prevPlayers.length) {
        return prevPlayers;
      }

      setNumberPlayers(newPlayers.length);

      // Broadcast the updated list to remaining guests
      send({
        type: 'PLAYER_LEAVE',
        payload: { players: newPlayers, playerId: peerId },
      });

      return newPlayers;
    });
  };

  // Handle incoming message (for both host and guest)
  const handleMessage = (msg: { data: string }, senderId?: string) => {
    const data = JSON.parse(msg.data);
    if (data.type === 'SYNC_STATE') {
      console.log('[NETWORK] Received SYNC_STATE', data.payload?.seq);
    } else {
      console.log('[NETWORK] Received message:', data, 'from', senderId);
    }

    if (isHost) {
      // ==================================================================
      // 🤡 Host: If host receives message from guest, run game logic here
      // ==================================================================
      switch (data.type) {
        // 🎲 JOIN_GAME
        case 'JOIN_GAME':
          if (data.payload.player) {
            // The id comes from the connection, so a guest can't join as someone else
            const player: PlayerInfo = { ...data.payload.player, playerId: senderId };
            setPlayers((prevPlayers: PlayerInfo[]) => {
              // Prevent duplicates if same player rejoins
              const exists = prevPlayers.some(
                (p) => p.playerId === player.playerId
              );

              if (exists) {
                return prevPlayers; // ✅ TypeScript knows this is PlayerInfo[]
              }

              // Build the new players list safely
              const newPlayers: PlayerInfo[] = [...prevPlayers, player];

              setNumberPlayers(newPlayers.length);

              // Broadcast the updated list to all guests
              send({
                type: 'PLAYER_JOIN',
                payload: {
                  players: newPlayers,
                  playerId: player.playerId,
                },
              });

              return newPlayers;
            });
          }
          break;
        
        // 🎲 GAME_START
        case 'GAME_START': // host starts game
          setGameStarted(true);
          break;

        // 🎲 ROLL_DICE, LOCK_DICE, UPDATE_DRAGON, TAKE_CARD, END_TURN
        case 'ROLL_DICE':
        case 'LOCK_DICE':
        case 'UPDATE_DRAGON':
        case 'TAKE_CARD':
        case 'END_TURN':
          if (gameDispatchRef.current) {
            // Checked against the host's state: only the current player, only
            // allowed moves, one at a time, and a roll, take card or end turn
            // only if no other one ran since the guest's board was drawn (a
            // fast double click sends two)
            const stale = ONCE_INTENTS.includes(data.type) && data.baseMove !== moveCount.current;
            const ran = stale
              ? Promise.resolve(false)
              : runIntent(gameDispatchRef.current, data, true, senderId);
            ran.then((ok) => {
              if (!ok) {
                console.log('[NETWORK] Refused', data.type, 'from', senderId);
                // Nothing changes, so answer with the current board
                resendSync(senderId);
              }
            });
          }
          break;

        case 'PLAYER_LEAVE': // player left
          removePlayer(senderId);
          break;
      }
    } else {
      // ==================================================================
      // 🤡 Guest: receive messages from host (game state updates etc.)
      // ==================================================================
      switch (data.type) {
        // 🎲 PLAYER_JOIN
        case 'PLAYER_JOIN': // new player joined
          if (data.payload.players) {
            setPlayers(data.payload.players);
            setNumberPlayers(data.payload.players.length);
          }
          break;

        // 🎲 PLAYER_LEAVE
        case 'PLAYER_LEAVE': // player left
          if (data.payload.players) {
            setPlayers(data.payload.players);
            setNumberPlayers(data.payload.players.length);
          }
          break;

        // 🎲 GAME_START
        case 'GAME_START': // host starts game
          setGameStartedState(data.payload);
          setGameStarted(true);
          break;
        
        case 'HOST_LEAVE': //host leaves game
          notifyHostLeft();
        break;

        // 🎲 SYNC_STATE: the whole board, after every change on the host
        case 'SYNC_STATE': {
          const { seq, state } = data.payload;
          if (seq > syncSeq.current) {
            syncSeq.current = seq;
            moveCount.current = data.payload.move;
            lastSync.current = data;
            // Before the board is ready it's applied by setupGame
            gameDispatchRef.current?.({ type: 'loadGameState', payload: state, meta: { remote: true } });
          }
          hostAnswerListeners.forEach((listener) => listener());
          break;
        }
      }
    }

    // Update local messages state for UI/debugging if needed
    if (data.type !== 'SYNC_STATE') {
      setMessages((msgs) => [...msgs, { data, senderId }]);
    }
  };


  useEffect(() => {
    if (!roomId || !playerId) return;

    let cancelled = false;
    hostLeftHandledRef.current = false;
    // A new room starts counting updates from 0
    syncSeq.current = 0;
    moveCount.current = 0;
    lastSync.current = null;

    if (isHost) {

      // ==================================================================
      // 🤡 Host: Setup connections for all guests
      // ==================================================================
      const host = setupHostPeersWithFirestore(roomId, playerId, (peerId, channel) => {

        // When a new guest connects via Firestore signaling, create DataChannelSocket
        const socket = new DataChannelSocket(channel);

        // Store guest connection
        guestConnectionsRef.current.set(peerId, socket);

        socket.onmessage = (msg) => handleMessage(msg, peerId);

        socket.onopen = () => {
          console.log(`[Network] Connection open with guest ${peerId}`);
        };

        socket.onerror = (err) => {
          console.error(
            `[Network] Connection error with guest ${peerId}:`,
            err
          );
        };
      }, (peerId) => {
          console.log(`[Network] Connection closed with guest ${peerId}`);
          guestConnectionsRef.current.delete(peerId);
          removePlayer(peerId);
      });

      host.ready.catch((err) => {
        if (cancelled) return;
        console.error('[Network] Failed to create room:', err);
        alert('⚠️ Failed to create the room. Please try again later.');
        window.location.href = '/';
      });

      // When the tab closes there is no time for async cleanup, so tell
      // guests directly and mark the room inactive with a request that
      // outlives the page. Docs left behind are removed by the TTL policy.
      const onPageHide = () => {
        send({ type: 'HOST_LEAVE', payload: {} });
        markRoomInactiveOnUnload(roomId);
      };
      window.addEventListener('pagehide', onPageHide);

      teardownRef.current = host.teardown;

      return () => {
        cancelled = true;
        window.removeEventListener('pagehide', onPageHide);
        guestConnectionsRef.current.clear();
        if (teardownRef.current === host.teardown) {
          teardownRef.current = null;
        }
        host.teardown().catch((err) =>
          console.error('[Network] Failed to clean up room:', err)
        );
      };
    }

    // ==================================================================
    // 🤡 Guest: Setup a single connection to host
    // ==================================================================
    const guest = setupGuestPeerWithFirestore(roomId, playerId, notifyHostLeft);

    guest.ready.then((channel) => {
      if (cancelled) return;

      const socket = new DataChannelSocket(channel);
      guestSocketRef.current = socket;

      socket.onmessage = handleMessage;

      socket.onopen = () => {
        console.log('[Network] Connected to host');

        // Flush queue
        sendQueueRef.current.forEach((msg) => socket.send(msg));
        sendQueueRef.current = [];
      };

      socket.onclose = () => {
        console.log('[Network] Disconnected from host');
        guestSocketRef.current = null;
        notifyHostLeft();
      };

      socket.onerror = (err) => {
        console.error('[Network] Socket error:', err);
      };
    }).catch((err) => {
      if (cancelled) return;
      console.error('[Network] Guest failed to join:', err);

      // 🚨 Simple alert-based error handling
      if (err.message === 'ROOM_NOT_FOUND') {
        alert('❌ This room does not exist or was deleted.');
      } else if (err.message === 'GAME_IN_PROGRESS') {
        alert('⚠️ The game has already started.');
      } else if (err.message === 'ROOM_FULL') {
        alert('⚠️ The room is full');
      } else {
        alert('⚠️ Failed to join the game. Please try again later.');
      }
      window.location.href = '/';
    });

    teardownRef.current = guest.teardown;

    // Cleanup on unmount or context changes
    return () => {
      cancelled = true;
      hostLeftHandledRef.current = true;
      guestSocketRef.current = null;
      sendQueueRef.current = [];
      if (teardownRef.current === guest.teardown) {
        teardownRef.current = null;
      }
      guest.teardown();
    };
  }, [roomId, playerId, isHost]);

  // Host: tells guests the game is over, then deletes the room.
  // Guest: closes the connection; the host notices and removes the player.
  const leaveRoom = async () => {
    const teardown = teardownRef.current;
    teardownRef.current = null;
    hostLeftHandledRef.current = true;
    if (isHost) {
      send({ type: 'HOST_LEAVE', payload: {} });
    }
    try {
      await teardown?.();
    } catch (err) {
      console.error('[Network] Failed to leave room:', err);
    }
  };

  // Host: sends the last board update to one guest
  const resendSync = (peerId: string) => {
    const socket = guestConnectionsRef.current.get(peerId);
    if (lastSync.current && socket?.readyState === 'open') {
      socket.send(JSON.stringify({ ...lastSync.current, senderId: playerId }));
    }
  };

  const send = (action: any) => {
    const message = JSON.stringify({ ...action, senderId: playerId });
    const logged =
      action.type === 'SYNC_STATE' ? `SYNC_STATE ${action.payload.seq} (${message.length} bytes)` : message;

    if (isHost) {
      // Host broadcasts to all guests
      guestConnectionsRef.current.forEach((socket) => {
        if (socket.channel.readyState === 'open') {
        console.log(
          '🟩 [Network] Host broadcasts to guest: ',
          logged
        );
          socket.send(message);
        }
      });
    } else {
      // Guest sends only to host
      if (guestSocketRef.current?.readyState === 'open') {
        console.log(
          '🟩 [Network] Guest sends to host: ',
          logged
        );
        guestSocketRef.current.channel.send(message);
      } else {
        console.log(
          '🟩 [Network] Guest socket not ready, queueing message:',
          message
        );
        sendQueueRef.current.push(message);
      }
    }
  };


  return (
    <NetworkContext.Provider value={{ send, leaveRoom, messages }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
