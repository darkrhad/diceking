  // src/firebase.ts
  import { initializeApp } from 'firebase/app';
  import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

  // Replace with your own Firebase config from the console
const firebaseConfig = {
  apiKey: "AIzaSyBW8-iyW6srvWBS7yCTGiUfzMK3GAUqNvY",
  authDomain: "dice-king-server.firebaseapp.com",
  projectId: "dice-king-server",
  storageBucket: "dice-king-server.firebasestorage.app",
  messagingSenderId: "180195927729",
  appId: "1:180195927729:web:6321524bcaacd5415f6490"
};

// REACT_APP_USE_EMULATOR=true (set by the e2e tests) talks to a local
// Firestore emulator. "demo-" project IDs can never reach a real project.
const useEmulator = process.env.REACT_APP_USE_EMULATOR === 'true';
const emulatorPort = Number(process.env.REACT_APP_EMULATOR_PORT || 8085);

  const app = initializeApp(
    useEmulator ? { ...firebaseConfig, projectId: 'demo-dice-king' } : firebaseConfig
  );
  export const db = getFirestore(app);

if (useEmulator) {
  connectFirestoreEmulator(db, 'localhost', emulatorPort);
}

// Firestore REST API for the same database, for requests that must survive
// the page unloading (the SDK's own writes are dropped then).
export const firestoreRest = {
  documentsUrl: `${
    useEmulator ? `http://localhost:${emulatorPort}` : 'https://firestore.googleapis.com'
  }/v1/projects/${app.options.projectId}/databases/(default)/documents`,
  apiKey: firebaseConfig.apiKey,
};
