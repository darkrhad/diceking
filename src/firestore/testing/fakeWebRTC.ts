// Minimal WebRTC stand-in. Two peers connect once each side has the other's
// session description AND at least one of the other's ICE candidates, so a
// lost candidate means the connection never comes up, as in a real browser
// behind NAT.

class FakeEventTarget {
  private handlers = new Map<string, Set<(event: any) => void>>();

  addEventListener(type: string, handler: (event: any) => void, options?: { once?: boolean }) {
    const wrapped = options?.once
      ? (event: any) => {
          this.removeEventListener(type, wrapped);
          handler(event);
        }
      : handler;
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(wrapped);
  }

  removeEventListener(type: string, handler: (event: any) => void) {
    this.handlers.get(type)?.delete(handler);
  }

  emit(type: string, event: any = {}) {
    (this as any)[`on${type}`]?.(event);
    [...(this.handlers.get(type) ?? [])].forEach((handler) => handler(event));
  }
}

export class FakeDataChannel extends FakeEventTarget {
  readyState: RTCDataChannelState = 'connecting';
  peer?: FakeDataChannel;
  sent: string[] = [];

  constructor(public label: string) {
    super();
  }

  open() {
    if (this.readyState !== 'connecting') return;
    this.readyState = 'open';
    this.emit('open');
  }

  send(data: string) {
    if (this.readyState !== 'open') throw new Error('InvalidStateError');
    this.sent.push(data);
    const peer = this.peer;
    queueMicrotask(() => peer?.receive(data));
  }

  receive(data: string) {
    if (this.readyState === 'open') this.emit('message', { data });
  }

  close() {
    if (this.readyState === 'closed') return;
    this.readyState = 'closed';
    this.emit('close');
    const peer = this.peer;
    queueMicrotask(() => peer?.close());
  }
}

let nextId = 0;

export class FakeRTCPeerConnection extends FakeEventTarget {
  static instances: FakeRTCPeerConnection[] = [];

  id = ++nextId;
  localDescription: any = null;
  remoteDescription: any = null;
  connectionState: RTCPeerConnectionState = 'new';
  channels: FakeDataChannel[] = [];
  remoteCandidates: string[] = [];
  gatheredCandidates: string[] = [];
  connected = false;

  onicecandidate: ((event: any) => void) | null = null;
  ondatachannel: ((event: any) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;

  constructor(public config?: RTCConfiguration) {
    super();
    FakeRTCPeerConnection.instances.push(this);
  }

  createDataChannel(label: string) {
    const channel = new FakeDataChannel(label);
    this.channels.push(channel);
    return channel;
  }

  async createOffer() {
    return { type: 'offer', sdp: `sdp-${this.id}` };
  }

  async createAnswer() {
    return { type: 'answer', sdp: `sdp-${this.id}` };
  }

  async setLocalDescription(description: { type: string; sdp: string }) {
    this.assertOpen();
    const { type, sdp } = description;
    this.localDescription = { type, sdp, toJSON: () => ({ type, sdp }) };
    // Gathering starts right away; candidates are emitted before the caller
    // gets to do anything else asynchronous (e.g. a Firestore write).
    queueMicrotask(() => {
      ['host', 'srflx', 'relay'].forEach((kind) => this.gather(`cand-${this.id}-${kind}`));
      this.onicecandidate?.({ candidate: null });
    });
  }

  private gather(candidate: string) {
    if (this.connectionState === 'closed') return;
    this.gatheredCandidates.push(candidate);
    const init = { candidate, sdpMid: '0', sdpMLineIndex: 0 };
    this.onicecandidate?.({ candidate: { ...init, toJSON: () => init } });
  }

  async setRemoteDescription(description: { type: string; sdp: string }) {
    this.assertOpen();
    this.remoteDescription = { type: description.type, sdp: description.sdp };
    this.tryConnect();
  }

  async addIceCandidate(candidate: { candidate: string }) {
    this.assertOpen();
    if (!this.remoteDescription) throw new Error('InvalidStateError: no remote description');
    this.remoteCandidates.push(candidate.candidate);
    this.tryConnect();
  }

  private peer() {
    return FakeRTCPeerConnection.instances.find(
      (other) => other !== this && other.localDescription?.sdp === this.remoteDescription?.sdp
    );
  }

  private hasCandidateFrom(peer: FakeRTCPeerConnection) {
    return this.remoteCandidates.some((c) => c.startsWith(`cand-${peer.id}-`));
  }

  private tryConnect() {
    const peer = this.peer();
    if (!peer || this.connected || peer.connected) return;
    if (peer.remoteDescription?.sdp !== this.localDescription?.sdp) return;
    if (!this.hasCandidateFrom(peer) || !peer.hasCandidateFrom(this)) return;

    const [offerer, answerer] = this.localDescription.type === 'offer' ? [this, peer] : [peer, this];
    offerer.connected = answerer.connected = true;
    queueMicrotask(() => {
      offerer.setState('connected');
      answerer.setState('connected');
      offerer.channels.forEach((channel) => {
        const remote = new FakeDataChannel(channel.label);
        channel.peer = remote;
        remote.peer = channel;
        answerer.channels.push(remote);
        answerer.emit('datachannel', { channel: remote });
        channel.open();
        remote.open();
      });
    });
  }

  setState(state: RTCPeerConnectionState) {
    if (this.connectionState === 'closed') return;
    this.connectionState = state;
    this.emit('connectionstatechange');
  }

  close() {
    if (this.connectionState === 'closed') return;
    // Like browsers, close() does not fire connectionstatechange
    this.connectionState = 'closed';
    this.channels.forEach((channel) => channel.close());
  }

  private assertOpen() {
    if (this.connectionState === 'closed') throw new Error('InvalidStateError: closed');
  }
}

class FakeDescription {
  constructor(init: any) {
    Object.assign(this, init);
  }
}

export const installFakeWebRTC = () => {
  nextId = 0;
  FakeRTCPeerConnection.instances = [];
  Object.assign(globalThis, {
    RTCPeerConnection: FakeRTCPeerConnection,
    RTCSessionDescription: FakeDescription,
    RTCIceCandidate: FakeDescription,
  });
};
