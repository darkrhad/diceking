// The dragon's roar and the fire's whoosh, made with Web Audio so no sound
// files are needed. To use recorded sounds instead, play them from here.

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  const Context = window.AudioContext || (window as any).webkitAudioContext;
  if (!Context) return null;
  if (!context) context = new Context();
  // Browsers start it suspended until the page has been clicked
  if (context.state === 'suspended') context.resume().catch(() => {});
  return context;
}

function noise(ctx: AudioContext, seconds: number): AudioBufferSourceNode {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  return source;
}

// Low, rough and growling: two detuned saws that rise and fall, chopped by a
// fast wobble, with breath noise on top
function roar(ctx: AudioContext, out: AudioNode, at: number) {
  const length = 1.1;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(500, at);
  filter.frequency.linearRampToValueAtTime(900, at + 0.3);
  filter.frequency.linearRampToValueAtTime(350, at + length);
  filter.Q.value = 6;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.9, at + 0.12);
  gain.gain.setValueAtTime(0.9, at + 0.55);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);

  // The growl: the volume wobbling ~28 times a second
  const growl = ctx.createGain();
  growl.gain.value = 0.6;
  const wobble = ctx.createOscillator();
  wobble.frequency.value = 28;
  const wobbleDepth = ctx.createGain();
  wobbleDepth.gain.value = 0.4;
  wobble.connect(wobbleDepth).connect(growl.gain);

  [0, 7].forEach((detune) => {
    const saw = ctx.createOscillator();
    saw.type = 'sawtooth';
    saw.detune.value = detune * 10;
    saw.frequency.setValueAtTime(70, at);
    saw.frequency.exponentialRampToValueAtTime(120, at + 0.3);
    saw.frequency.exponentialRampToValueAtTime(55, at + length);
    saw.connect(growl);
    saw.start(at);
    saw.stop(at + length);
  });

  const breath = noise(ctx, length);
  const breathFilter = ctx.createBiquadFilter();
  breathFilter.type = 'bandpass';
  breathFilter.frequency.value = 700;
  breathFilter.Q.value = 0.8;
  const breathGain = ctx.createGain();
  breathGain.gain.value = 0.35;
  breath.connect(breathFilter).connect(breathGain).connect(growl);
  breath.start(at);

  growl.connect(filter).connect(gain).connect(out);
  wobble.start(at);
  wobble.stop(at + length);
}

// Fire rushing out: noise opening up bright, then dying down
function whoosh(ctx: AudioContext, out: AudioNode, at: number) {
  const length = 1.2;
  const source = noise(ctx, length);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(300, at);
  filter.frequency.exponentialRampToValueAtTime(3500, at + 0.25);
  filter.frequency.exponentialRampToValueAtTime(600, at + length);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.8, at + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);

  source.connect(filter).connect(gain).connect(out);
  source.start(at);
}

export function playDragonFire(volume = 0.5) {
  const ctx = audio();
  if (!ctx) return;
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  const now = ctx.currentTime + 0.02;
  roar(ctx, master, now);
  // The fire comes out as the roar peaks
  whoosh(ctx, master, now + 0.3);
}
