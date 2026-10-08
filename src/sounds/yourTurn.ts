// A short horn call for "Your turn!", made with Web Audio

import { audio } from './audio';

// A brassy note: detuned saws through a filter that opens as it's blown
function brass(
  ctx: AudioContext,
  out: AudioNode,
  at: number,
  frequency: number,
  length: number
) {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 2;
  filter.frequency.setValueAtTime(400, at);
  filter.frequency.exponentialRampToValueAtTime(2600, at + 0.08);
  filter.frequency.exponentialRampToValueAtTime(1200, at + length);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.35, at + 0.04);
  gain.gain.setValueAtTime(0.3, at + length * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);

  [-6, 6].forEach((detune) => {
    const saw = ctx.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.value = frequency;
    saw.detune.value = detune;
    saw.connect(filter);
    saw.start(at);
    saw.stop(at + length + 0.05);
  });
  filter.connect(gain).connect(out);
}

// Ta-ta-daaa: two short notes and a long one up a fifth
export function playYourTurn(volume = 0.4) {
  const ctx = audio();
  if (!ctx) return;
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  const now = ctx.currentTime + 0.02;
  brass(ctx, master, now, 392, 0.12);
  brass(ctx, master, now + 0.14, 392, 0.12);
  brass(ctx, master, now + 0.28, 587, 0.6);
  brass(ctx, master, now + 0.28, 784, 0.6);
}
