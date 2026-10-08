import { makeStyles } from '@material-ui/core';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimCardDecks } from 'hooks/useAnimateCards';
import { playCardEffect } from 'sounds/cardEffects';
import { CardEffect, CardEffectKind } from 'state/cardEffects';

const useStyles = makeStyles(() => ({
  '@keyframes floatUp': {
    '0%': { opacity: 0, transform: 'translate(-50%, 0) scale(0.6)' },
    '15%': { opacity: 1, transform: 'translate(-50%, -1vh) scale(1.2)' },
    '100%': { opacity: 0, transform: 'translate(-50%, -7vh) scale(1)' },
  },
  '@keyframes banner': {
    '0%': { opacity: 0, transform: 'translate(-50%, -50%) scale(0.5)' },
    '15%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1.08)' },
    '25%': { transform: 'translate(-50%, -50%) scale(1)' },
    '80%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
    '100%': { opacity: 0, transform: 'translate(-50%, -60%) scale(1)' },
  },
  canvas: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    // Above the board, below the dragon's fire and the kingdom viewer
    zIndex: 1190,
  },
  text: {
    position: 'fixed',
    zIndex: 1191,
    pointerEvents: 'none',
    fontFamily: 'font1',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    textShadow: '0 0.2vw 0.4vw #000',
  },
  popup: {
    fontSize: '2vw',
    animation: '$floatUp 1400ms ease-out forwards',
  },
  banner: {
    left: '50%',
    top: '38%',
    fontSize: '4vw',
    padding: '1vh 3vw',
    borderRadius: '1vw',
    background: 'rgba(0, 0, 0, 0.55)',
    animation: '$banner 1700ms ease-out forwards',
  },
}));

type RGB = [number, number, number];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  // How much the size grows per second, as a fraction
  grow: number;
  color: RGB;
  alpha: number;
  gravity: number;
  drag: number;
  shape: 'dot' | 'coin';
  glow: boolean;
  twinkle?: boolean;
  // Side to side drift, like spores in the air
  sway?: number;
  // Circling a point, for the hypnotist's spiral and the sorcerer's ring
  orbit?: {
    cx: number;
    cy: number;
    angle: number;
    radius: number;
    spin: number;
    radiusSpeed: number;
  };
}

interface Text {
  key: number;
  text: string;
  color: string;
  banner: boolean;
  x?: number;
  y?: number;
}

const between = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(items: T[]) =>
  items[Math.floor(Math.random() * items.length)];

const VILLAGE_COLORS: Record<string, RGB> = {
  purple: [190, 110, 255],
  yellow: [255, 210, 60],
  green: [110, 220, 90],
  blue: [80, 160, 255],
  brown: [210, 150, 90],
};

const rgb = ([r, g, b]: RGB, a = 1) => `rgba(${r}, ${g}, ${b}, ${a})`;

interface CardEffectsProps {
  effect: CardEffect;
  decks: AnimCardDecks;
  soundOn: boolean;
}

// Plays an effect when a card lands in a kingdom (see state/cardEffects):
// particles on a canvas over the board, the pile or avatar reacting, a
// popup or banner, and a sound. Every screen plays it from state.
export default function CardEffects({
  effect,
  decks,
  soundOn,
}: CardEffectsProps) {
  const classes = useStyles();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef(0);
  // The effect already in the state when the board appears is not replayed
  const lastStartRef = useRef(effect.start);
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;
  const [texts, setTexts] = useState<Text[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
      timersRef.current.forEach(clearTimeout);
    },
    []
  );

  const showText = (text: Omit<Text, 'key'>, ms: number) => {
    const key = Math.random();
    setTexts((list) => [...list, { ...text, key }]);
    timersRef.current.push(
      setTimeout(
        () => setTexts((list) => list.filter((t) => t.key !== key)),
        ms
      )
    );
  };

  // One loop draws every particle until none are left
  const run = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || frameRef.current) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const particles = particlesRef.current;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }
        if (p.orbit) {
          const o = p.orbit;
          o.angle += o.spin * dt;
          o.radius = Math.max(0, o.radius + o.radiusSpeed * dt);
          p.x = o.cx + Math.cos(o.angle) * o.radius;
          p.y = o.cy + Math.sin(o.angle) * o.radius;
        } else {
          p.vx *= 1 - p.drag * dt;
          p.vy = p.vy * (1 - p.drag * dt) + p.gravity * dt;
          p.x +=
            (p.vx + (p.sway ? Math.sin(p.life * 4 + p.sway) * 30 : 0)) * dt;
          p.y += p.vy * dt;
        }
        p.size *= 1 + p.grow * dt;

        const age = p.life / p.maxLife;
        let alpha = p.alpha * (1 - age);
        if (p.twinkle) alpha *= 0.5 + 0.5 * Math.sin(p.life * 22 + p.x);
        ctx.globalCompositeOperation = p.glow ? 'lighter' : 'source-over';
        ctx.fillStyle = rgb(p.color, alpha);
        ctx.beginPath();
        if (p.shape === 'coin') {
          // A spinning coin: an ellipse that narrows and widens
          const width =
            Math.max(0.15, Math.abs(Math.cos(p.life * 14))) * p.size;
          ctx.ellipse(p.x, p.y, width, p.size, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = rgb([150, 100, 0], alpha);
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (particles.length > 0) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        frameRef.current = 0;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (effect.start === lastStartRef.current) return;
    lastStartRef.current = effect.start;

    const pile = decks.kingdom.current;
    const avatar =
      decks.kingdomSmall[effect.target]?.current?.parentElement?.querySelector(
        'img'
      );
    if (!pile) return;

    if (soundOnRef.current) playCardEffect(effect.kind, effect.combo ?? 1, 0.5);

    const rect = pile.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const avatarRect = avatar?.getBoundingClientRect();
    const scale = window.innerWidth / 1600;
    const add = (count: number, make: (i: number) => Partial<Particle>) => {
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x: cx,
          y: cy,
          vx: 0,
          vy: 0,
          life: 0,
          maxLife: 1,
          size: 5 * scale,
          grow: 0,
          color: [255, 255, 255],
          alpha: 1,
          gravity: 0,
          drag: 0,
          shape: 'dot',
          glow: true,
          ...make(i),
        });
      }
    };

    presets[effect.kind]({
      effect,
      pile,
      avatar,
      rect,
      cx,
      cy,
      avatarRect,
      scale,
      add,
      showText,
    });
    run();
  }, [effect.start]);

  return createPortal(
    (
      <>
        <canvas ref={canvasRef} className={classes.canvas} />
        {texts.map((t) => (
          <div
            key={t.key}
            className={`${classes.text} ${
              t.banner ? classes.banner : classes.popup
            }`}
            style={{
              color: t.color,
              ...(t.banner ? {} : { left: t.x, top: t.y }),
            }}
          >
            {t.text}
          </div>
        ))}
      </>
    ) as any,
    // On document.body, above the board; the cast is for @types/react-dom,
    // which brings its own newer @types/react
    document.body
  );
}

interface PresetContext {
  effect: CardEffect;
  pile: HTMLElement;
  avatar?: HTMLImageElement | null;
  rect: DOMRect;
  cx: number;
  cy: number;
  avatarRect?: DOMRect;
  scale: number;
  add: (count: number, make: (i: number) => Partial<Particle>) => void;
  showText: (text: Omit<Text, 'key'>, ms: number) => void;
}

const shake = (
  el: Element | null | undefined,
  distance = '0.4vw',
  duration = 350
) =>
  el?.animate(
    [
      { transform: 'translate(0, 0)' },
      { transform: `translate(-${distance}, 0)` },
      { transform: `translate(${distance}, 0)` },
      { transform: `translate(-${distance}, 0)` },
      { transform: 'translate(0, 0)' },
    ],
    { duration, easing: 'ease-out' }
  );

const glow = (el: Element | null | undefined, color: string, duration = 800) =>
  el?.animate(
    [
      { boxShadow: `0 0 0 0 ${color}`, filter: 'brightness(1)' },
      {
        boxShadow: `0 0 2.5vw 0.8vw ${color}`,
        filter: 'brightness(1.5)',
        offset: 0.25,
      },
      { boxShadow: '0 0 0 0 rgba(0, 0, 0, 0)', filter: 'brightness(1)' },
    ],
    { duration, easing: 'ease-out' }
  );

const presets: Record<CardEffectKind, (c: PresetContext) => void> = {
  // A hammer strike: stone dust kicked up from the base, the pile shaking
  dwarf: ({ rect, cx, scale, add, pile }) => {
    add(40, () => ({
      x: cx + between(-rect.width / 2, rect.width / 2),
      y: rect.bottom,
      vx: between(-120, 120) * scale,
      vy: between(-160, -40) * scale,
      gravity: 120 * scale,
      drag: 2.5,
      size: between(5, 11) * scale,
      grow: 1.2,
      maxLife: between(0.6, 1),
      color: pick<RGB>([
        [150, 125, 100],
        [120, 100, 80],
        [180, 160, 130],
      ]),
      alpha: 0.6,
      glow: false,
    }));
    shake(pile, '0.5vw', 400);
  },

  // Crazy: the card spins round as it lands, wobbling, with blue sparks
  gnome: ({ rect, cx, cy, scale, add, pile }) => {
    add(30, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = between(120, 320) * scale;
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        drag: 3,
        size: between(2, 4) * scale,
        maxLife: between(0.4, 0.8),
        color: pick<RGB>([[80, 160, 255], [140, 210, 255], [255, 255, 255]]),
        twinkle: true,
      };
    });
    pile.animate(
      [
        { transform: 'rotate(0deg) scale(1)' },
        { transform: 'rotate(360deg) scale(1.1)', offset: 0.5 },
        { transform: 'rotate(354deg) scale(1)', offset: 0.65 },
        { transform: 'rotate(366deg) scale(1)', offset: 0.8 },
        { transform: 'rotate(357deg) scale(1)', offset: 0.9 },
        { transform: 'rotate(360deg) scale(1)' },
      ],
      { duration: 700, easing: 'ease-out' }
    );
  },

  // A heavy landing: green dust puffing out of both sides, the pile squashing
  orc: ({ rect, scale, add, pile }) => {
    add(30, (i) => {
      const side = i % 2 === 0 ? -1 : 1;
      return {
        x: side < 0 ? rect.left : rect.right,
        y: rect.bottom - between(0, rect.height * 0.2),
        vx: side * between(80, 220) * scale,
        vy: between(-60, 0) * scale,
        drag: 3,
        size: between(6, 12) * scale,
        grow: 1.5,
        maxLife: between(0.5, 0.9),
        color: pick<RGB>([
          [110, 170, 70],
          [90, 140, 60],
          [150, 190, 100],
        ]),
        alpha: 0.6,
        glow: false,
      };
    });
    pile.animate(
      [
        { transform: 'scale(1, 1)' },
        { transform: 'scale(1.12, 0.84)', offset: 0.3 },
        { transform: 'scale(0.95, 1.06)', offset: 0.6 },
        { transform: 'scale(1, 1)' },
      ],
      { duration: 450, easing: 'ease-out' }
    );
  },

  // Gold coins bursting out and falling, the card shining
  snob: ({ rect, cx, scale, add, pile }) => {
    add(28, () => ({
      x: cx + between(-rect.width / 4, rect.width / 4),
      y: rect.top + rect.height * 0.3,
      vx: between(-220, 220) * scale,
      vy: between(-520, -280) * scale,
      gravity: 1100 * scale,
      size: between(5, 8) * scale,
      maxLife: between(0.9, 1.3),
      color: [255, 205, 50],
      shape: 'coin',
      glow: false,
    }));
    glow(pile, 'rgba(255, 210, 60, 0.9)', 700);
  },

  // A golden glint, and a reminder of the 4 rolls it gives next turn
  elf: ({ rect, cx, cy, scale, add, pile, showText }) => {
    add(20, () => ({
      x: cx + between(-rect.width / 2, rect.width / 2),
      y: cy + between(-rect.height / 2, rect.height / 2),
      vy: between(-40, -10) * scale,
      size: between(2, 4) * scale,
      maxLife: between(0.6, 1.1),
      color: [255, 230, 140],
      twinkle: true,
    }));
    glow(pile, 'rgba(255, 220, 120, 0.8)', 800);
    showText(
      { text: '4 rolls next turn!', color: '#ffd84a', banner: true },
      1700
    );
  },

  // Sparkles around the card and the fairy count (they score squared)
  fairy: ({ effect, rect, cx, cy, scale, add, pile, showText }) => {
    add(45, () => ({
      x: cx + between(-rect.width * 0.7, rect.width * 0.7),
      y: cy + between(-rect.height * 0.6, rect.height * 0.6),
      vx: between(-20, 20) * scale,
      vy: between(-70, -20) * scale,
      size: between(1.5, 4) * scale,
      maxLife: between(0.7, 1.4),
      color: pick<RGB>([
        [255, 180, 240],
        [255, 255, 255],
        [200, 170, 255],
      ]),
      twinkle: true,
    }));
    glow(pile, 'rgba(255, 170, 240, 0.8)', 800);
    const combo = effect.combo ?? 1;
    showText(
      {
        text: `×${combo} = ${combo * combo} pts`,
        color: '#ffb8f0',
        banner: false,
        x: cx,
        y: rect.top,
      },
      1400
    );
  },

  // A purple ring around the avatar and the extra turn it gives
  sorcerer: ({ avatarRect, cx, cy, rect, scale, add, avatar, showText }) => {
    const target = avatarRect ?? rect;
    const ox = avatarRect ? target.left + target.width / 2 : cx;
    const oy = avatarRect ? target.top + target.height / 2 : cy;
    const radius = Math.max(target.width, target.height) * 0.75;
    add(48, (i) => ({
      orbit: {
        cx: ox,
        cy: oy,
        angle: (i / 48) * Math.PI * 2,
        radius,
        spin: 4,
        radiusSpeed: 25 * scale,
      },
      size: between(2, 4) * scale,
      maxLife: between(1, 1.3),
      color: pick<RGB>([
        [190, 110, 255],
        [140, 80, 255],
        [230, 190, 255],
      ]),
    }));
    glow(avatar, 'rgba(170, 90, 255, 0.9)', 1100);
    showText({ text: 'Extra turn!', color: '#d9a8ff', banner: true }, 1700);
  },

  // Coloured spores drifting up
  mushroom: ({ rect, cx, scale, add }) => {
    add(35, () => ({
      x: cx + between(-rect.width / 3, rect.width / 3),
      y: rect.top + rect.height * 0.3,
      vx: between(-30, 30) * scale,
      vy: between(-90, -35) * scale,
      sway: Math.random() * 10,
      size: between(2, 5) * scale,
      grow: 0.3,
      maxLife: between(1.1, 1.6),
      color: pick<RGB>([
        [255, 90, 90],
        [255, 220, 70],
        [80, 220, 200],
        [255, 140, 220],
      ]),
      alpha: 0.85,
    }));
  },

  // A spiral winding in around the card
  hypnotist: ({ rect, cx, cy, scale, add, pile }) => {
    const radius = Math.max(rect.width, rect.height) * 0.9;
    add(60, (i) => ({
      orbit: {
        cx,
        cy,
        angle: (i / 60) * Math.PI * 6,
        radius: radius * (0.4 + (i / 60) * 0.8),
        spin: 5,
        radiusSpeed: -radius * 0.9,
      },
      size: between(2, 4) * scale,
      maxLife: 0.95,
      color: pick<RGB>([
        [255, 255, 255],
        [200, 160, 255],
        [150, 200, 255],
      ]),
    }));
    pile.animate(
      [
        { transform: 'rotate(0deg)' },
        { transform: 'rotate(-4deg)' },
        { transform: 'rotate(4deg)' },
        { transform: 'rotate(0deg)' },
      ],
      {
        duration: 700,
        easing: 'ease-in-out',
      }
    );
  },

  // A red flash on the player and the minus points floating up
  scoundrel: ({ effect, avatar, avatarRect, rect, cx, showText }) => {
    avatar?.animate(
      [
        { filter: 'none', boxShadow: '0 0 0 0 rgba(255, 0, 0, 0)' },
        {
          filter: 'saturate(2) hue-rotate(-20deg) brightness(0.8)',
          boxShadow: '0 0 2vw 0.6vw rgba(255, 30, 30, 0.9)',
          offset: 0.2,
        },
        { filter: 'none', boxShadow: '0 0 0 0 rgba(255, 0, 0, 0)' },
      ],
      { duration: 1000, easing: 'ease-out' }
    );
    shake(avatar?.parentElement, '0.3vw', 300);
    // Over the avatar, or the pile when there's no avatar to point at
    const at = avatarRect ?? rect;
    showText(
      {
        text: `-${effect.points}`,
        color: '#ff6a5a',
        banner: false,
        x: avatarRect ? at.left + at.width / 2 : cx,
        y: at.top,
      },
      1400
    );
  },

  // A warm glow in the village's colour
  village: ({ effect, rect, cx, cy, scale, add, pile }) => {
    const color = VILLAGE_COLORS[effect.color ?? ''] ?? [255, 220, 150];
    add(16, () => ({
      x: cx + between(-rect.width / 2, rect.width / 2),
      y: cy + between(-rect.height / 2, rect.height / 2),
      vy: between(-60, -20) * scale,
      size: between(2, 4) * scale,
      maxLife: between(0.5, 0.9),
      color,
    }));
    glow(pile, rgb(color, 0.85), 700);
  },
};
