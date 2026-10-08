// Shared Web Audio setup for the generated sound effects

let context: AudioContext | null = null;

export function audio(): AudioContext | null {
  const Context = window.AudioContext || (window as any).webkitAudioContext;
  if (!Context) return null;
  if (!context) context = new Context();
  // Browsers start it suspended until the page has been clicked
  if (context.state === 'suspended') context.resume().catch(() => {});
  return context;
}

export function noise(
  ctx: AudioContext,
  seconds: number
): AudioBufferSourceNode {
  const buffer = ctx.createBuffer(
    1,
    Math.ceil(ctx.sampleRate * seconds),
    ctx.sampleRate
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  return source;
}

// A gain node that rises fast to peak at `at` and dies away over `decay`
export function envelope(
  ctx: AudioContext,
  at: number,
  peak: number,
  decay: number,
  attack = 0.005
) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  return gain;
}

// One tone through an envelope
export function tone(
  ctx: AudioContext,
  out: AudioNode,
  at: number,
  frequency: number,
  decay: number,
  peak = 0.3,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, at);
  osc.connect(envelope(ctx, at, peak, decay)).connect(out);
  osc.start(at);
  osc.stop(at + decay + 0.05);
  return osc;
}
