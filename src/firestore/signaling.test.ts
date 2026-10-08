import { installFakeWebRTC, FakeRTCPeerConnection } from './testing/fakeWebRTC';
import * as fake from './testing/fakeFirestore';
import { setupHostPeersWithFirestore } from './setupHostPeersWithFirestore';
import { setupGuestPeerWithFirestore } from './setupGuestPeerWithFirestore';
import { deleteRoomCompletely, deleteGuestSignaling, markRoomInactiveOnUnload } from './deleteRoom';
import { DataChannelSocket } from './DataChannelSocket';

jest.mock('firebase/firestore', () => require('./testing/fakeFirestore'));
jest.mock('./firebase', () => ({
  db: {},
  firestoreRest: { documentsUrl: 'https://firestore.test/documents', apiKey: 'KEY' },
}));

const ROOM = 'ROOM01';
const HOST = 'host-1';

const sleep = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (condition: () => boolean, timeoutMs = 1000) => {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await sleep(5);
  }
};

const startHost = (options = {}) => {
  const joined: string[] = [];
  const left: string[] = [];
  const channels = new Map<string, RTCDataChannel>();
  const host = setupHostPeersWithFirestore(
    ROOM,
    HOST,
    (guestId, channel) => {
      joined.push(guestId);
      channels.set(guestId, channel);
    },
    (guestId) => left.push(guestId),
    options
  );
  return { ...host, joined, left, channels };
};

const hostPeerFor = (guestPc: FakeRTCPeerConnection) =>
  FakeRTCPeerConnection.instances.find(
    (pc) => pc !== guestPc && pc.remoteDescription?.sdp === guestPc.localDescription?.sdp
  );

beforeEach(() => {
  fake.__reset();
  installFakeWebRTC();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('host + guest signaling', () => {
  it('connects a guest and exchanges messages over the data channel', async () => {
    const host = startHost();
    await host.ready;

    const guest = setupGuestPeerWithFirestore(ROOM, 'guest-1');
    const channel = await guest.ready;

    await waitFor(() => host.joined.includes('guest-1'));
    expect(channel.readyState).toBe('open');

    const received: string[] = [];
    host.channels.get('guest-1').addEventListener('message', (e) => received.push(e.data));
    channel.send('hello host');
    await waitFor(() => received.length === 1);
    expect(received).toEqual(['hello host']);

    guest.teardown();
    await host.teardown();
  });

  it('writes every gathered ICE candidate to Firestore on both sides', async () => {
    const host = startHost();
    await host.ready;
    const guest = setupGuestPeerWithFirestore(ROOM, 'guest-1');
    await guest.ready;

    const guestPc = FakeRTCPeerConnection.instances[0];
    const hostPc = hostPeerFor(guestPc);
    const stored = (path: string) =>
      fake.__paths(path).map((p) => fake.__store.get(p).candidate).sort();

    expect(stored(`rooms/${ROOM}/callerCandidates/guest-1/callerCandidates/`)).toEqual(
      [...guestPc.gatheredCandidates].sort()
    );
    expect(stored(`rooms/${ROOM}/calleeCandidates/guest-1/calleeCandidates/`)).toEqual(
      [...hostPc.gatheredCandidates].sort()
    );
    expect(guestPc.gatheredCandidates).toHaveLength(3);
    expect(hostPc.gatheredCandidates).toHaveLength(3);

    guest.teardown();
    await host.teardown();
  });

  it('keeps candidate queues per guest when several guests join at once', async () => {
    const host = startHost();
    await host.ready;

    const guests = ['guest-1', 'guest-2', 'guest-3'].map((id) =>
      setupGuestPeerWithFirestore(ROOM, id)
    );
    await Promise.all(guests.map((g) => g.ready));
    await waitFor(() => host.joined.length === 3);

    expect([...host.joined].sort()).toEqual(['guest-1', 'guest-2', 'guest-3']);

    guests.forEach((g) => g.teardown());
    await host.teardown();
  });

  it('does not delete other rooms when a host creates a room', async () => {
    fake.__store.set('rooms/OLD', { active: false });
    const host = startHost();
    await host.ready;

    expect(fake.__store.has('rooms/OLD')).toBe(true);
    await host.teardown();
  });

  it('stamps every doc with expireAt so the TTL policy can collect leftovers', async () => {
    const host = startHost();
    await host.ready;
    const guest = setupGuestPeerWithFirestore(ROOM, 'guest-1');
    await guest.ready;

    const paths = fake.__paths(`rooms/${ROOM}`);
    expect(paths.length).toBeGreaterThan(3);
    paths.forEach((path) => expect(fake.__store.get(path).expireAt).toBeInstanceOf(fake.Timestamp));

    guest.teardown();
    await host.teardown();
  });
});

describe('host: guest disconnects', () => {
  const connectOne = async (options = {}) => {
    const host = startHost(options);
    await host.ready;
    const guest = setupGuestPeerWithFirestore(ROOM, 'guest-1');
    await guest.ready;
    await waitFor(() => host.joined.includes('guest-1'));
    const hostPc = hostPeerFor(FakeRTCPeerConnection.instances[0]);
    return { host, guest, hostPc };
  };

  it('keeps a guest whose connection recovers from "disconnected"', async () => {
    const { host, guest, hostPc } = await connectOne({ disconnectGraceMs: 50 });

    hostPc.setState('disconnected');
    await sleep(10);
    hostPc.setState('connected');
    await sleep(80);

    expect(host.left).toEqual([]);
    guest.teardown();
    await host.teardown();
  });

  it('drops a guest that stays "disconnected" past the grace period', async () => {
    const { host, guest, hostPc } = await connectOne({ disconnectGraceMs: 30 });

    hostPc.setState('disconnected');
    await waitFor(() => host.left.length > 0);

    expect(host.left).toEqual(['guest-1']);
    guest.teardown();
    await host.teardown();
  });

  it('reports a leaving guest once and deletes its signaling docs', async () => {
    const { host, guest, hostPc } = await connectOne();

    hostPc.setState('failed');
    host.channels.get('guest-1').close();
    await waitFor(() => fake.__paths(`rooms/${ROOM}/`).length === 0);

    expect(host.left).toEqual(['guest-1']);
    expect(fake.__store.has(`rooms/${ROOM}`)).toBe(true);
    guest.teardown();
    await host.teardown();
  });

  it('notices when the guest closes the tab (data channel closes)', async () => {
    const { host, guest } = await connectOne();

    guest.teardown();
    await waitFor(() => host.left.length > 0);

    expect(host.left).toEqual(['guest-1']);
    await host.teardown();
  });
});

describe('host teardown', () => {
  it('unsubscribes, closes connections and deletes the room with all subcollections', async () => {
    const host = startHost();
    await host.ready;
    const guest = setupGuestPeerWithFirestore(ROOM, 'guest-1');
    await guest.ready;
    guest.teardown();
    await sleep(10);

    const guest2 = setupGuestPeerWithFirestore(ROOM, 'guest-2');
    await guest2.ready;
    guest2.teardown();

    await host.teardown();

    expect(fake.__paths('rooms/')).toEqual([]);
    expect(fake.__listenerCount()).toBe(0);
    FakeRTCPeerConnection.instances.forEach((pc) => expect(pc.connectionState).toBe('closed'));
    expect(host.left).toEqual(['guest-1']);
  });

  it('does not leave an orphaned room when torn down before the room was created', async () => {
    const host = startHost();
    const teardown = host.teardown();
    await teardown;

    expect(fake.__paths('rooms/')).toEqual([]);
    expect(fake.__listenerCount()).toBe(0);
  });

  it('is safe to call twice', async () => {
    const host = startHost();
    await host.ready;
    await Promise.all([host.teardown(), host.teardown()]);
    expect(fake.__paths('rooms/')).toEqual([]);
  });
});

describe('guest join checks', () => {
  it('rejects a room that does not exist', async () => {
    const guest = setupGuestPeerWithFirestore('NOPE', 'guest-1');
    await expect(guest.ready).rejects.toThrow('ROOM_NOT_FOUND');
  });

  it('rejects an inactive room', async () => {
    fake.__store.set(`rooms/${ROOM}`, { active: false });
    await expect(setupGuestPeerWithFirestore(ROOM, 'g').ready).rejects.toThrow('ROOM_NOT_FOUND');
  });

  it('rejects an abandoned room whose host stopped sending heartbeats', async () => {
    fake.__store.set(`rooms/${ROOM}`, {
      active: true,
      expireAt: fake.Timestamp.fromMillis(Date.now() - 1000),
    });
    await expect(setupGuestPeerWithFirestore(ROOM, 'g').ready).rejects.toThrow('ROOM_NOT_FOUND');
  });

  it('rejects a game in progress', async () => {
    fake.__store.set(`rooms/${ROOM}`, { active: true, gameStarted: true });
    await expect(setupGuestPeerWithFirestore(ROOM, 'g').ready).rejects.toThrow('GAME_IN_PROGRESS');
  });

  it('rejects a full room (host + 5 guests)', async () => {
    fake.__store.set(`rooms/${ROOM}`, { active: true });
    for (let i = 0; i < 5; i++) fake.__store.set(`rooms/${ROOM}/answers/g${i}`, { answer: {} });
    await expect(setupGuestPeerWithFirestore(ROOM, 'g').ready).rejects.toThrow('ROOM_FULL');
  });

  it('times out and cleans up when the host never answers', async () => {
    fake.__store.set(`rooms/${ROOM}`, { active: true });
    const guest = setupGuestPeerWithFirestore(ROOM, 'g', undefined, { timeoutMs: 30 });

    await expect(guest.ready).rejects.toThrow('JOIN_TIMEOUT');
    await sleep(0);
    expect(fake.__listenerCount()).toBe(0);
    expect(FakeRTCPeerConnection.instances[0].connectionState).toBe('closed');
  });

  it('fails the join if the room is deleted while connecting', async () => {
    fake.__store.set(`rooms/${ROOM}`, { active: true });
    const guest = setupGuestPeerWithFirestore(ROOM, 'g');
    await waitFor(() => fake.__store.has(`rooms/${ROOM}/signals/g`));

    await fake.deleteDoc(fake.doc(null, `rooms/${ROOM}`));
    await expect(guest.ready).rejects.toThrow('ROOM_NOT_FOUND');
  });
});

describe('guest: host leaves', () => {
  it('calls onHostLeft once when the host deletes the room', async () => {
    const host = startHost();
    await host.ready;
    const onHostLeft = jest.fn();
    const guest = setupGuestPeerWithFirestore(ROOM, 'guest-1', onHostLeft);
    await guest.ready;

    await host.teardown();
    await sleep(10);

    expect(onHostLeft).toHaveBeenCalledTimes(1);
    guest.teardown();
  });

  it('does not call onHostLeft after the guest left on its own', async () => {
    const host = startHost();
    await host.ready;
    const onHostLeft = jest.fn();
    const guest = setupGuestPeerWithFirestore(ROOM, 'guest-1', onHostLeft);
    await guest.ready;

    guest.teardown();
    await host.teardown();
    await sleep(10);

    expect(onHostLeft).not.toHaveBeenCalled();
  });
});

describe('deleteRoom', () => {
  it('deleteRoomCompletely removes candidates, signals, answers and the room', async () => {
    const s = fake.__store;
    s.set(`rooms/${ROOM}`, { active: true });
    s.set(`rooms/${ROOM}/signals/g1`, {});
    s.set(`rooms/${ROOM}/answers/g1`, {});
    s.set(`rooms/${ROOM}/callerCandidates/g1/callerCandidates/a`, {});
    s.set(`rooms/${ROOM}/calleeCandidates/g1/calleeCandidates/b`, {});
    s.set(`rooms/${ROOM}/answers/g2`, {});
    s.set(`rooms/${ROOM}/calleeCandidates/g2/calleeCandidates/c`, {});
    s.set('rooms/OTHER', { active: true });

    await deleteRoomCompletely(ROOM);

    expect(fake.__paths('rooms/')).toEqual(['rooms/OTHER']);
  });

  it('markRoomInactiveOnUnload sends a keepalive PATCH that survives unload', () => {
    const fetchMock = jest.fn().mockResolvedValue({});
    (globalThis as any).fetch = fetchMock;

    markRoomInactiveOnUnload(ROOM);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      `https://firestore.test/documents/rooms/${ROOM}?updateMask.fieldPaths=active&currentDocument.exists=true&key=KEY`
    );
    expect(init).toMatchObject({ method: 'PATCH', keepalive: true });
    expect(JSON.parse(init.body)).toEqual({ fields: { active: { booleanValue: false } } });
  });

  it('deleteGuestSignaling only removes that guest', async () => {
    const s = fake.__store;
    s.set(`rooms/${ROOM}/signals/g1`, {});
    s.set(`rooms/${ROOM}/callerCandidates/g1/callerCandidates/a`, {});
    s.set(`rooms/${ROOM}/signals/g2`, {});

    await deleteGuestSignaling(ROOM, 'g1');

    expect(fake.__paths('rooms/')).toEqual([`rooms/${ROOM}/signals/g2`]);
  });
});

describe('DataChannelSocket', () => {
  it('does not replace listeners already on the channel', async () => {
    const host = startHost();
    await host.ready;
    const guest = setupGuestPeerWithFirestore(ROOM, 'guest-1');
    await guest.ready;
    await waitFor(() => host.joined.length === 1);

    const socket = new DataChannelSocket(host.channels.get('guest-1'));
    const onclose = jest.fn();
    socket.onclose = onclose;

    guest.teardown();
    await waitFor(() => host.left.length === 1);

    // Both the signaling code's close listener and the socket's fired
    expect(host.left).toEqual(['guest-1']);
    expect(onclose).toHaveBeenCalledTimes(1);
    await host.teardown();
  });
});
