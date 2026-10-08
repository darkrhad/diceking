import { db } from './firebase';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { deleteGuestSignaling, deleteRoomCompletely } from './deleteRoom';
import {
  RTC_CONFIG,
  HEARTBEAT_MS,
  ROOM_TTL_MS,
  SIGNALING_TTL_MS,
  expiresIn,
} from './signalingConfig';

// A 'disconnected' connection often recovers on its own (network hiccup,
// tab in background), so the guest is only dropped if it stays that way.
const DISCONNECT_GRACE_MS = 10 * 1000;

export interface HostPeers {
  // Resolves once the room doc exists and guests can join.
  ready: Promise<void>;
  // Stops listening, closes every connection and deletes the room.
  teardown: () => Promise<void>;
}

interface HostOptions {
  disconnectGraceMs?: number;
}

interface GuestConnection {
  peerConnection: RTCPeerConnection;
  unsubscribeCandidates?: Unsubscribe;
  disconnectTimer?: ReturnType<typeof setTimeout>;
}

export function setupHostPeersWithFirestore(
  roomId: string,
  hostId: string,
  onGuestJoin: (guestId: string, channel: RTCDataChannel) => void,
  onGuestLeave: (guestId: string) => void,
  { disconnectGraceMs = DISCONNECT_GRACE_MS }: HostOptions = {}
): HostPeers {
  const roomDocRef = doc(db, `rooms/${roomId}`);
  const connections = new Map<string, GuestConnection>();
  // Guests that already left; their offer doc can still show up in a snapshot.
  const leftGuests = new Set<string>();
  let unsubscribeSignals: Unsubscribe | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const closeConnection = (guestId: string) => {
    const connection = connections.get(guestId);
    if (!connection) return;
    connections.delete(guestId);
    leftGuests.add(guestId);
    clearTimeout(connection.disconnectTimer);
    connection.unsubscribeCandidates?.();
    connection.peerConnection.close();
  };

  // Data channel close, 'failed' and an expired 'disconnected' grace period
  // can all fire for the same guest; only the first one counts.
  const guestLeft = (guestId: string) => {
    if (closed || !connections.has(guestId)) return;
    console.log(`[Host] Guest ${guestId} left`);
    closeConnection(guestId);
    deleteGuestSignaling(roomId, guestId).catch((err) =>
      console.warn(`[Host] Failed to delete signaling for ${guestId}:`, err)
    );
    onGuestLeave(guestId);
  };

  const connectGuest = async (guestId: string, offer: RTCSessionDescriptionInit) => {
    const peerConnection = new RTCPeerConnection(RTC_CONFIG);
    const connection: GuestConnection = { peerConnection };
    connections.set(guestId, connection);

    // Attach before setLocalDescription: candidates gathered while a
    // Firestore write is pending would otherwise be lost.
    const calleeCandidates = collection(
      db,
      `rooms/${roomId}/calleeCandidates/${guestId}/calleeCandidates`
    );
    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) return;
      addDoc(calleeCandidates, {
        ...event.candidate.toJSON(),
        expireAt: expiresIn(SIGNALING_TTL_MS),
      }).catch((err) => console.warn('🟧 Failed to send ICE candidate:', err));
    };

    peerConnection.ondatachannel = (event) => {
      const dataChannel = event.channel;
      const join = () => {
        console.log(`[Host] DataChannel open with guest ${guestId}`);
        onGuestJoin(guestId, dataChannel);
      };
      if (dataChannel.readyState === 'open') {
        join();
      } else {
        dataChannel.addEventListener('open', join, { once: true });
      }
      dataChannel.addEventListener('close', () => guestLeft(guestId));
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      if (state === 'connected') {
        clearTimeout(connection.disconnectTimer);
        connection.disconnectTimer = undefined;
      } else if (state === 'disconnected') {
        if (!connection.disconnectTimer) {
          console.log(`[Host] Guest ${guestId} disconnected, waiting to recover`);
          connection.disconnectTimer = setTimeout(
            () => guestLeft(guestId),
            disconnectGraceMs
          );
        }
      } else if (state === 'failed' || state === 'closed') {
        guestLeft(guestId);
      }
    };

    // Candidates can arrive before the offer is applied; queue them per guest.
    const pendingCandidates: RTCIceCandidateInit[] = [];
    let remoteDescriptionSet = false;
    const addCandidate = async (candidate: RTCIceCandidateInit) => {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('🟧 Failed to add ICE candidate:', err);
      }
    };
    connection.unsubscribeCandidates = onSnapshot(
      collection(db, `rooms/${roomId}/callerCandidates/${guestId}/callerCandidates`),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type !== 'added') return;
          const { expireAt, ...candidate } = change.doc.data();
          if (remoteDescriptionSet) {
            addCandidate(candidate);
          } else {
            pendingCandidates.push(candidate);
          }
        });
      }
    );

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    remoteDescriptionSet = true;
    await Promise.all(pendingCandidates.splice(0).map(addCandidate));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    await setDoc(doc(db, `rooms/${roomId}/answers/${guestId}`), {
      answer: peerConnection.localDescription.toJSON(),
      expireAt: expiresIn(SIGNALING_TTL_MS),
    });
  };

  const ready = (async () => {
    await setDoc(roomDocRef, {
      hostId,
      active: true,
      createdAt: Date.now(),
      expireAt: expiresIn(ROOM_TTL_MS),
    });
    if (closed) return;

    heartbeat = setInterval(() => {
      updateDoc(roomDocRef, { expireAt: expiresIn(ROOM_TTL_MS) }).catch((err) =>
        console.warn('[Host] Heartbeat failed:', err)
      );
    }, HEARTBEAT_MS);

    unsubscribeSignals = onSnapshot(
      collection(db, `rooms/${roomId}/signals`),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type !== 'added') return;
          const guestId = change.doc.id;
          if (connections.has(guestId) || leftGuests.has(guestId)) return;
          const offer = change.doc.data()?.offer;
          if (!offer) return;

          connectGuest(guestId, offer).catch((err) => {
            console.error(`[Host] Failed to connect guest ${guestId}:`, err);
            guestLeft(guestId);
          });
        });
      }
    );
  })();

  const teardown = async () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    unsubscribeSignals?.();
    [...connections.keys()].forEach(closeConnection);

    // Deleting before the room doc is created would leave it orphaned.
    await ready.catch(() => {});
    await deleteRoomCompletely(roomId);
  };

  return { ready, teardown };
}
