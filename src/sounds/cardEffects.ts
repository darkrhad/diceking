// Sounds for the card effects, made with Web Audio so no sound files are
// needed. To use recorded sounds instead, play them from here.

import { CardEffectKind } from 'state/cardEffects';
import { audio, envelope, noise, tone } from './audio';

// Filtered noise through an envelope: dust, puffs, clacks
function burst(
  ctx: AudioContext,
  out: AudioNode,
  at: number,
  type: BiquadFilterType,
  frequency: number,
  decay: number,
  peak = 0.5,
  q = 1
) {
  const source = noise(ctx, decay + 0.1);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = q;
  source.connect(filter).connect(envelope(ctx, at, peak, decay)).connect(out);
  source.start(at);
}

const sounds: Record<
  CardEffectKind,
  (ctx: AudioContext, out: AudioNode, at: number, combo: number) => void
> = {
  // Anvil: metal partials that don't fit a scale, ringing out, on a sharp hit
  dwarf: (ctx, out, at) => {
    burst(ctx, out, at, 'highpass', 2500, 0.05, 0.6);
    [520, 1340, 2210, 3170].forEach((f, i) =>
      tone(ctx, out, at, f, 0.9 - i * 0.15, 0.22 - i * 0.04)
    );
  },

  // A heavy thud: a falling low tone and a dull knock
  orc: (ctx, out, at) => {
    const osc = tone(ctx, out, at, 110, 0.35, 0.7);
    osc.frequency.exponentialRampToValueAtTime(40, at + 0.3);
    burst(ctx, out, at, 'lowpass', 300, 0.2, 0.5);
  },

  // Coins: short bright pings at random moments
  snob: (ctx, out, at) => {
    for (let i = 0; i < 9; i++) {
      const when = at + Math.random() * 0.5;
      tone(ctx, out, when, 2400 + Math.random() * 2200, 0.18, 0.12, 'triangle');
      tone(ctx, out, when, 5200 + Math.random() * 1500, 0.08, 0.05);
    }
  },

  // A rising harp run
  elf: (ctx, out, at) => {
    [523, 659, 784, 988, 1175, 1568].forEach((f, i) =>
      tone(ctx, out, at + i * 0.06, f, 0.6, 0.18, 'triangle')
    );
  },

  // A bell that rings higher with every fairy in the kingdom
  fairy: (ctx, out, at, combo) => {
    const base = 880 * Math.pow(2, (Math.min(combo, 6) - 1) * (2 / 12));
    tone(ctx, out, at, base, 1, 0.22);
    tone(ctx, out, at, base * 2.76, 0.6, 0.08);
    tone(ctx, out, at + 0.08, base * 1.5, 0.8, 0.12);
  },

  // A shimmer: high tones wavering, sweeping up
  sorcerer: (ctx, out, at) => {
    [660, 990, 1320].forEach((f, i) => {
      const osc = tone(ctx, out, at + i * 0.05, f, 1.1, 0.12);
      osc.frequency.exponentialRampToValueAtTime(f * 1.5, at + 1);
      const wobble = ctx.createOscillator();
      wobble.frequency.value = 9;
      const depth = ctx.createGain();
      depth.gain.value = f * 0.02;
      wobble.connect(depth).connect(osc.frequency);
      wobble.start(at);
      wobble.stop(at + 1.2);
    });
  },

  // A soft poof
  mushroom: (ctx, out, at) => {
    burst(ctx, out, at, 'bandpass', 900, 0.35, 0.5, 0.7);
    const osc = tone(ctx, out, at, 300, 0.25, 0.15);
    osc.frequency.exponentialRampToValueAtTime(700, at + 0.2);
  },

  // A wobbly woo-oo
  hypnotist: (ctx, out, at) => {
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(500, at);
    osc.frequency.exponentialRampToValueAtTime(260, at + 0.45);
    osc.frequency.exponentialRampToValueAtTime(520, at + 0.9);
    const wobble = ctx.createOscillator();
    wobble.frequency.value = 6;
    const depth = ctx.createGain();
    depth.gain.value = 25;
    wobble.connect(depth).connect(osc.frequency);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.25, at + 0.08);
    gain.gain.setValueAtTime(0.25, at + 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 1);
    osc.connect(gain).connect(out);
    [osc, wobble].forEach((o) => {
      o.start(at);
      o.stop(at + 1.05);
    });
  },

  // A cheeky "ha-ha-ha": a buzzy voice through a vowel-like filter,
  // each "ha" a little lower
  scoundrel: (ctx, out, at) => {
    for (let i = 0; i < 4; i++) {
      const when = at + i * 0.13;
      const voice = ctx.createOscillator();
      voice.type = 'sawtooth';
      voice.frequency.setValueAtTime(330 - i * 25, when);
      voice.frequency.exponentialRampToValueAtTime(260 - i * 25, when + 0.1);
      const vowel = ctx.createBiquadFilter();
      vowel.type = 'bandpass';
      vowel.frequency.value = 850;
      vowel.Q.value = 3;
      voice
        .connect(vowel)
        .connect(envelope(ctx, when, 0.5, 0.1, 0.01))
        .connect(out);
      voice.start(when);
      voice.stop(when + 0.15);
      burst(ctx, out, when, 'highpass', 3000, 0.04, 0.08);
    }
  },

  // A wooden clack
  village: (ctx, out, at) => {
    burst(ctx, out, at, 'bandpass', 1300, 0.07, 0.7, 4);
    tone(ctx, out, at, 420, 0.12, 0.25, 'triangle');
  },
};

export function playCardEffect(kind: CardEffectKind, combo = 1, volume = 0.5) {
  const ctx = audio();
  if (!ctx) return;
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  sounds[kind](ctx, master, ctx.currentTime + 0.02, combo);
}
