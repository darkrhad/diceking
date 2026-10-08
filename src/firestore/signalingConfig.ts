import { Timestamp } from 'firebase/firestore';

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    {
      urls: 'stun:stun.relay.metered.ca:80',
    },
    {
      urls: 'turn:global.relay.metered.ca:80',
      username: 'e226882a12608f2c331dbea0',
      credential: 'qsddk71lXnHub1U9',
    },
    {
      urls: 'turn:global.relay.metered.ca:80?transport=tcp',
      username: 'e226882a12608f2c331dbea0',
      credential: 'qsddk71lXnHub1U9',
    },
    {
      urls: 'turn:global.relay.metered.ca:443',
      username: 'e226882a12608f2c331dbea0',
      credential: 'qsddk71lXnHub1U9',
    },
    {
      urls: 'turns:global.relay.metered.ca:443?transport=tcp',
      username: 'e226882a12608f2c331dbea0',
      credential: 'qsddk71lXnHub1U9',
    },
  ],
  // REACT_APP_FORCE_TURN=true sends all traffic through the TURN servers,
  // to check they work for players who can't connect directly.
  iceTransportPolicy: process.env.REACT_APP_FORCE_TURN === 'true' ? 'relay' : 'all',
};

// Players in a room, host included.
export const MAX_PLAYERS = 6;

// The host pushes the room's expireAt forward every HEARTBEAT_MS. A room whose
// expireAt has passed was abandoned (the host tab died without cleaning up).
export const HEARTBEAT_MS = 60 * 1000;
export const ROOM_TTL_MS = 5 * 60 * 1000;

// Offers, answers and ICE candidates are only needed while connecting.
export const SIGNALING_TTL_MS = 6 * 60 * 60 * 1000;

// Every doc gets an expireAt so a Firestore TTL policy can delete whatever
// the clients failed to clean up (see README).
export const expiresIn = (ms: number) => Timestamp.fromMillis(Date.now() + ms);

export const isExpired = (expireAt?: Timestamp) =>
  !!expireAt && expireAt.toMillis() < Date.now();
