import { makeStyles } from '@material-ui/core';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimCardDecks } from 'hooks/useAnimateCards';
import { playDragonFire } from 'sounds/dragonFire';
import { DragonFire as DragonFireEvent } from 'state/State';

const useStyles = makeStyles(() => ({
  '@keyframes floatUp': {
    '0%': { opacity: 0, transform: 'translate(-50%, 0) scale(0.6)' },
    '15%': { opacity: 1, transform: 'translate(-50%, -1vh) scale(1.25)' },
    '100%': { opacity: 0, transform: 'translate(-50%, -7vh) scale(1)' },
  },
  canvas: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    // Above the board and the flying card, below the kingdom viewer
    zIndex: 1200,
  },
  damage: {
    position: 'fixed',
    zIndex: 1201,
    pointerEvents: 'none',
    fontFamily: 'font1',
    fontWeight: 'bold',
    fontSize: '2.4vw',
    color: '#ffdd55',
    textShadow: '0 0 0.6vw #ff4400, 0 0.2vw 0.3vw #000',
    animation: '$floatUp 1400ms ease-out forwards',
  },
}));

// How long the fire pours out, and how long a flame lives (seconds)
const BREATH = 0.9;
const FLAME_LIFE = [0.45, 0.75];

interface Flame {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

const between = ([min, max]: number[]) => min + Math.random() * (max - min);

// Hot white at the start of a flame's life, then orange, red and smoke
function flameColor(age: number) {
  if (age < 0.2) return [255, 240, 190, 0.9];
  if (age < 0.5) return [255, 150, 30, 0.8];
  if (age < 0.8) return [220, 50, 10, 0.55];
  return [60, 40, 30, 0.35 * (1 - age) * 5];
}

interface DragonFireProps {
  fire: DragonFireEvent;
  decks: AnimCardDecks;
  soundOn: boolean;
}

// When a dragon is given away, it breathes fire from the player's deck onto
// their avatar: flames, a burst on impact, the avatar shaking and scorched,
// and the minus points floating up. Every screen plays it from state.
export default function DragonFire({ fire, decks, soundOn }: DragonFireProps) {
  const classes = useStyles();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The fire already in the state when the board appears is not replayed
  const lastStartRef = useRef(fire.start);
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;
  const [damage, setDamage] = useState<{ x: number; y: number; text: string; key: number } | null>(null);

  useEffect(() => {
    if (fire.start === lastStartRef.current) return;
    lastStartRef.current = fire.start;

    const deck = decks.kingdomSmall[fire.target]?.current;
    const avatar = deck?.parentElement?.querySelector('img');
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!deck || !avatar || !canvas || !ctx) return;

    if (soundOnRef.current) playDragonFire(0.5);

    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    // From the dragon card on the deck to the middle of the avatar
    const deckRect = deck.getBoundingClientRect();
    const avatarRect = avatar.getBoundingClientRect();
    const from = { x: deckRect.left + deckRect.width * 0.2, y: deckRect.top + deckRect.height / 2 };
    const to = { x: avatarRect.left + avatarRect.width / 2, y: avatarRect.top + avatarRect.height / 2 };
    const distance = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    // Flames reach the avatar in about 0.35 s
    const speed = distance / 0.35;
    const scale = window.innerWidth / 1600;

    const flames: Flame[] = [];
    const spawn = (x: number, y: number, direction: number, flameSpeed: number, size: number) =>
      flames.push({
        x,
        y,
        vx: Math.cos(direction) * flameSpeed,
        vy: Math.sin(direction) * flameSpeed,
        life: 0,
        maxLife: between(FLAME_LIFE),
        size,
      });

    const timers: ReturnType<typeof setTimeout>[] = [];
    let frame = 0;
    let last = performance.now();
    const t0 = last;
    let burst = false;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const elapsed = (now - t0) / 1000;

      if (elapsed < BREATH) {
        for (let i = 0; i < 14; i++) {
          spawn(from.x, from.y, angle + between([-0.22, 0.22]), speed * between([0.75, 1.15]), between([6, 13]) * scale);
        }
      }
      // The fire hits: a burst around the avatar
      if (!burst && elapsed > 0.35) {
        burst = true;
        for (let i = 0; i < 70; i++) {
          spawn(to.x, to.y, Math.random() * Math.PI * 2, between([60, 240]) * scale, between([5, 12]) * scale);
        }
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = flames.length - 1; i >= 0; i--) {
        const f = flames[i];
        f.life += dt;
        if (f.life >= f.maxLife) {
          flames.splice(i, 1);
          continue;
        }
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        // Slowing down and rising, like hot air
        f.vx *= 1 - 2.2 * dt;
        f.vy = f.vy * (1 - 2.2 * dt) - 90 * scale * dt;
        f.size *= 1 + 1.6 * dt;

        const age = f.life / f.maxLife;
        const [r, g, b, a] = flameColor(age);
        ctx.globalCompositeOperation = age < 0.8 ? 'lighter' : 'source-over';
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (elapsed < BREATH || flames.length > 0) {
        frame = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };
    frame = requestAnimationFrame(tick);

    // The avatar takes the hit
    timers.push(
      setTimeout(() => {
        avatar.parentElement?.animate(
          [
            { transform: 'translate(0, 0)' },
            { transform: 'translate(-0.5vw, 0.2vw)' },
            { transform: 'translate(0.5vw, -0.2vw)' },
            { transform: 'translate(-0.35vw, 0)' },
            { transform: 'translate(0.35vw, 0.1vw)' },
            { transform: 'translate(0, 0)' },
          ],
          { duration: 500, easing: 'ease-out' }
        );
        avatar.animate(
          [
            { filter: 'none', boxShadow: '0 0 0 0 rgba(255, 90, 0, 0)' },
            {
              filter: 'sepia(0.9) saturate(3) hue-rotate(-25deg) brightness(0.7)',
              boxShadow: '0 0 2vw 0.6vw rgba(255, 90, 0, 0.9)',
              offset: 0.2,
            },
            { filter: 'none', boxShadow: '0 0 0 0 rgba(255, 90, 0, 0)' },
          ],
          { duration: 1800, easing: 'ease-out' }
        );
        setDamage({
          x: avatarRect.left + avatarRect.width / 2,
          y: avatarRect.top,
          text: `-${fire.points}`,
          key: fire.start,
        });
      }, 350)
    );
    timers.push(setTimeout(() => setDamage(null), 350 + 1400));

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [fire.start]);

  // Drawn on document.body, above the board; the cast is for @types/react-dom,
  // which brings its own newer @types/react
  return createPortal(
    (
      <>
        <canvas ref={canvasRef} className={classes.canvas} />
        {damage && (
          <div key={damage.key} className={classes.damage} style={{ left: damage.x, top: damage.y }}>
            {damage.text}
          </div>
        )}
      </>
    ) as any,
    document.body
  );
}
