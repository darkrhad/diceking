export class DataChannelSocket {
  channel: RTCDataChannel;
  onmessage: ((event: { data: string }) => void) | null = null;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: any) => void) | null = null;

  constructor(channel: RTCDataChannel) {
    this.channel = channel;

    // addEventListener, not channel.onX, so the listeners the signaling code
    // put on the same channel are not replaced.
    channel.addEventListener('open', () => this.onopen?.());
    channel.addEventListener('close', () => this.onclose?.());
    channel.addEventListener('message', (event) =>
      this.onmessage?.({ data: event.data })
    );
    // Note: RTCDataChannel error events have limited info, so just forward them
    channel.addEventListener('error', (event) => this.onerror?.(event));

    // The channel is usually open already; onopen is assigned after construction.
    if (channel.readyState === 'open') {
      setTimeout(() => this.onopen?.(), 0);
    }
  }

  get readyState(): RTCDataChannelState {
    return this.channel.readyState;
  }

  send(data: string) {
    if (this.readyState === 'open') {
      this.channel.send(data);
    } else {
      console.warn('[DataChannelSocket] Tried to send on closed channel');
    }
  }

  close() {
    this.channel.close();
  }
}
