import { db } from './firebase';
import {
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  onSnapshot,
  setDoc,
  Unsubscribe,
} from 'firebase/firestore';
import {
  RTC_CONFIG,
  MAX_PLAYERS,
  SIGNALING_TTL_MS,
  expiresIn,
  isExpired,
} from './signalingConfig';

const JOIN_TIMEOUT_MS = 20 * 1000;

export interface GuestPeer {
  // Resolves with an open data channel to the host.
  ready: Promise<RTCDataChannel>;
  // Stops listening and closes the connection.
  teardown: () => void;
}

interface GuestOptions {
  timeoutMs?: number;
}

export function setupGuestPeerWithFirestore(
  roomId: string,
  guestId: string,
  onHostLeft?: () => void,
  { timeoutMs = JOIN_TIMEOUT_MS }: GuestOptions = {}
): GuestPeer {
  const peerConnection = new RTCPeerConnection(RTC_CONFIG);
  const dataChannel = peerConnection.createDataChannel('game');

  const roomRef = doc(db, `rooms/${roomId}`);
  const offerDocRef = doc(db, `rooms/${roomId}/signals/${guestId}`);
  const answerDocRef = doc(db, `rooms/${roomId}/answers/${guestId}`);

  const unsubscribers: Unsubscribe[] = [];
  let connected = false;
  let closed = false;
  let hostLeftNotified = false;

  const notifyHostLeft = () => {
    if (closed || hostLeftNotified) return;
    hostLeftNotified = true;
    onHostLeft?.();
  };

  const teardown = () => {
    if (closed) return;
    closed = true;
    unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
    dataChannel.close();
    peerConnection.close();
  };

  const ready = (async () => {
    const roomSnap = await getDoc(roomRef);
    const roomData = roomSnap.data();

    // 🚫 Room doesn't exist, was closed, or its host stopped sending heartbeats
    if (!roomSnap.exists() || roomData.active === false || isExpired(roomData.expireAt)) {
      throw new Error('ROOM_NOT_FOUND');
    }

    // 🚫 Game already in progress
    if (roomData.gameStarted) {
      throw new Error('GAME_IN_PROGRESS');
    }

    // 🚫 Room is full. The host deletes a guest's answer when the guest leaves.
    const guests = await getCountFromServer(collection(db, `rooms/${roomId}/answers`));
    if (guests.data().count >= MAX_PLAYERS - 1) {
      throw new Error('ROOM_FULL');
    }

    if (closed) throw new Error('JOIN_CANCELLED');

    // Attach before setLocalDescription: candidates gathered while a
    // Firestore write is pending would otherwise be lost.
    const callerCandidates = collection(
      db,
      `rooms/${roomId}/callerCandidates/${guestId}/callerCandidates`
    );
    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) return;
      addDoc(callerCandidates, {
        ...event.candidate.toJSON(),
        expireAt: expiresIn(SIGNALING_TTL_MS),
      }).catch((err) => console.warn('🟧 Failed to send ICE candidate:', err));
    };

    let failJoin: (err: Error) => void = () => {};
    const opened = new Promise<void>((resolve, reject) => {
      failJoin = reject;
      dataChannel.addEventListener('open', () => resolve(), { once: true });
      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'failed') {
          reject(new Error('CONNECTION_FAILED'));
        }
      };
    });
    // Rejections after the join settled (e.g. after a timeout) are expected.
    opened.catch(() => {});

    // Candidates can arrive before the answer is applied; queue them.
    const pendingCandidates: RTCIceCandidateInit[] = [];
    let remoteDescriptionSet = false;
    const addCandidate = async (candidate: RTCIceCandidateInit) => {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('🟧 Failed to add ICE candidate:', err);
      }
    };
    unsubscribers.push(
      onSnapshot(
        collection(db, `rooms/${roomId}/calleeCandidates/${guestId}/calleeCandidates`),
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
      )
    );

    let answerApplied = false;
    unsubscribers.push(
      onSnapshot(answerDocRef, async (docSnap) => {
        const answer = docSnap.data()?.answer;
        if (!answer || answerApplied) return;
        answerApplied = true;
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          remoteDescriptionSet = true;
          await Promise.all(pendingCandidates.splice(0).map(addCandidate));
        } catch (err) {
          failJoin(err);
        }
      })
    );

    // The host marks the room inactive or deletes it when leaving.
    unsubscribers.push(
      onSnapshot(roomRef, (snap) => {
        if (snap.exists() && snap.data()?.active !== false) return;
        if (connected) {
          notifyHostLeft();
        } else {
          failJoin(new Error('ROOM_NOT_FOUND'));
        }
      })
    );

    // Create and send offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    await setDoc(offerDocRef, {
      offer,
      guestId,
      expireAt: expiresIn(SIGNALING_TTL_MS),
    });

    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('JOIN_TIMEOUT')), timeoutMs);
    });
    try {
      await Promise.race([opened, timeout]);
    } finally {
      clearTimeout(timer);
    }

    connected = true;
    return dataChannel;
  })();

  // A failed join must not keep listeners or the connection alive.
  ready.catch(teardown);

  return { ready, teardown };
}
