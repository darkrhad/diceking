import { db, firestoreRest } from './firebase';
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  writeBatch,
  DocumentReference,
} from 'firebase/firestore';

// Firestore batches are limited to 500 writes.
const BATCH_LIMIT = 500;

async function deleteRefs(refs: DocumentReference[]) {
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    refs.slice(i, i + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

async function guestSignalingRefs(roomId: string, guestId: string) {
  const [callerCandidates, calleeCandidates] = await Promise.all([
    getDocs(
      collection(db, `rooms/${roomId}/callerCandidates/${guestId}/callerCandidates`)
    ),
    getDocs(
      collection(db, `rooms/${roomId}/calleeCandidates/${guestId}/calleeCandidates`)
    ),
  ]);
  return [
    doc(db, `rooms/${roomId}/signals/${guestId}`),
    doc(db, `rooms/${roomId}/answers/${guestId}`),
    ...callerCandidates.docs.map((d) => d.ref),
    ...calleeCandidates.docs.map((d) => d.ref),
  ];
}

// Deletes the offer, answer and ICE candidates exchanged with one guest.
export async function deleteGuestSignaling(roomId: string, guestId: string) {
  await deleteRefs(await guestSignalingRefs(roomId, guestId));
}

// A single write, so it has a chance to go out while the page is unloading.
// Guests watch the room doc and treat an inactive room as "host left".
export function markRoomInactive(roomId: string) {
  return updateDoc(doc(db, 'rooms', roomId), { active: false }).catch(() => {
    console.warn(`[Host] Room ${roomId} already deleted.`);
  });
}

// For pagehide: the SDK write in markRoomInactive is dropped when the page
// unloads, but the browser finishes a keepalive request after the page is gone.
export function markRoomInactiveOnUnload(roomId: string) {
  const { documentsUrl, apiKey } = firestoreRest;
  fetch(
    `${documentsUrl}/rooms/${roomId}?updateMask.fieldPaths=active&currentDocument.exists=true&key=${apiKey}`,
    {
      method: 'PATCH',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { active: { booleanValue: false } } }),
    }
  ).catch(() => {});
}

// Firestore does not delete subcollections together with their parent doc,
// so every signaling doc is deleted explicitly before the room itself.
export async function deleteRoomCompletely(roomId: string) {
  await markRoomInactive(roomId);

  const [signals, answers] = await Promise.all([
    getDocs(collection(db, `rooms/${roomId}/signals`)),
    getDocs(collection(db, `rooms/${roomId}/answers`)),
  ]);
  const guestIds = new Set([...signals.docs, ...answers.docs].map((d) => d.id));
  const guestRefs = await Promise.all(
    [...guestIds].map((guestId) => guestSignalingRefs(roomId, guestId))
  );

  await deleteRefs([...guestRefs.flat(), doc(db, 'rooms', roomId)]);

  console.log(`🧹 Room ${roomId} and all subcollections deleted.`);
}
