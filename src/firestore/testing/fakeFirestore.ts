// In-memory stand-in for the parts of 'firebase/firestore' the signaling code
// uses. Listeners are notified asynchronously, like the real SDK.

type Data = Record<string, any>;

const store = new Map<string, Data>();

interface Listener {
  path: string;
  kind: 'doc' | 'collection';
  callback: (snap: any) => void;
  known: Map<string, Data>;
}
const listeners = new Set<Listener>();

export class Timestamp {
  constructor(private millis: number) {}
  static fromMillis(millis: number) {
    return new Timestamp(millis);
  }
  static now() {
    return new Timestamp(Date.now());
  }
  toMillis() {
    return this.millis;
  }
}

let autoId = 0;

export const doc = (_db: unknown, ...segments: string[]) => {
  const path = segments.join('/');
  return { path, id: path.split('/').pop(), type: 'document' };
};

export const collection = (_db: unknown, ...segments: string[]) => {
  const path = segments.join('/');
  return { path, id: path.split('/').pop(), type: 'collection' };
};

const isDirectChild = (collectionPath: string, docPath: string) =>
  docPath.startsWith(collectionPath + '/') &&
  !docPath.slice(collectionPath.length + 1).includes('/');

const docsIn = (collectionPath: string) =>
  [...store.entries()].filter(([path]) => isDirectChild(collectionPath, path));

const docSnapshot = (path: string, data: Data | undefined) => ({
  id: path.split('/').pop(),
  ref: doc(null, path),
  exists: () => data !== undefined,
  data: () => (data === undefined ? undefined : { ...data }),
});

const notify = (listener: Listener) => {
  if (!listeners.has(listener)) return;
  if (listener.kind === 'doc') {
    listener.callback(docSnapshot(listener.path, store.get(listener.path)));
    return;
  }
  const current = new Map(docsIn(listener.path));
  const changes = [];
  current.forEach((data, path) => {
    const before = listener.known.get(path);
    if (!before) changes.push({ type: 'added', doc: docSnapshot(path, data) });
    else if (before !== data) changes.push({ type: 'modified', doc: docSnapshot(path, data) });
  });
  listener.known.forEach((data, path) => {
    if (!current.has(path)) changes.push({ type: 'removed', doc: docSnapshot(path, data) });
  });
  listener.known = current;
  if (changes.length === 0) return;
  listener.callback({
    docs: [...current.entries()].map(([path, data]) => docSnapshot(path, data)),
    docChanges: () => changes,
  });
};

const changed = (path: string) => {
  listeners.forEach((listener) => {
    const affected =
      listener.kind === 'doc' ? listener.path === path : isDirectChild(listener.path, path);
    if (affected) queueMicrotask(() => notify(listener));
  });
};

const write = (path: string, data: Data | undefined) => {
  if (data === undefined) store.delete(path);
  else store.set(path, data);
  changed(path);
};

export const setDoc = async (ref: { path: string }, data: Data, options?: { merge?: boolean }) => {
  write(ref.path, options?.merge ? { ...store.get(ref.path), ...data } : { ...data });
};

export const updateDoc = async (ref: { path: string }, data: Data) => {
  if (!store.has(ref.path)) throw new Error(`No document to update: ${ref.path}`);
  write(ref.path, { ...store.get(ref.path), ...data });
};

export const addDoc = async (ref: { path: string }, data: Data) => {
  const path = `${ref.path}/auto${++autoId}`;
  write(path, { ...data });
  return doc(null, path);
};

export const deleteDoc = async (ref: { path: string }) => {
  write(ref.path, undefined);
};

export const getDoc = async (ref: { path: string }) => docSnapshot(ref.path, store.get(ref.path));

export const getDocs = async (ref: { path: string }) => {
  const docs = docsIn(ref.path).map(([path, data]) => docSnapshot(path, data));
  return { docs, size: docs.length, empty: docs.length === 0 };
};

export const getCountFromServer = async (ref: { path: string }) => {
  const count = docsIn(ref.path).length;
  return { data: () => ({ count }) };
};

export const writeBatch = (_db: unknown) => {
  const deletes: string[] = [];
  return {
    delete: (ref: { path: string }) => {
      deletes.push(ref.path);
    },
    commit: async () => deletes.forEach((path) => write(path, undefined)),
  };
};

export const onSnapshot = (ref: { path: string; type: string }, callback: (snap: any) => void) => {
  const listener: Listener = {
    path: ref.path,
    kind: ref.type === 'document' ? 'doc' : 'collection',
    callback,
    known: new Map(),
  };
  listeners.add(listener);
  queueMicrotask(() => {
    if (listener.kind === 'doc') {
      notify(listener);
      return;
    }
    // First collection snapshot is always delivered, even when empty
    const current = new Map(docsIn(listener.path));
    listener.known = current;
    if (!listeners.has(listener)) return;
    callback({
      docs: [...current.entries()].map(([path, data]) => docSnapshot(path, data)),
      docChanges: () =>
        [...current.entries()].map(([path, data]) => ({ type: 'added', doc: docSnapshot(path, data) })),
    });
  });
  return () => {
    listeners.delete(listener);
  };
};

// ---- test helpers ----

export const __store = store;

export const __listenerCount = () => listeners.size;

export const __reset = () => {
  store.clear();
  listeners.clear();
  autoId = 0;
};

export const __paths = (prefix = '') =>
  [...store.keys()].filter((path) => path.startsWith(prefix)).sort();
