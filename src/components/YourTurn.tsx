import { makeStyles } from '@material-ui/core';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimCardDecks } from 'hooks/useAnimateCards';
import { Player } from 'state/State';

const useStyles = makeStyles(() => ({
  // In from the left, a moment in the middle, out to the right
  '@keyframes sweep': {
    '0%': { transform: 'translate(-120vw, -50%) skewX(-12deg)', opacity: 0 },
    '18%': { transform: 'translate(-50%, -50%) skewX(0deg)', opacity: 1 },
    '78%': { transform: 'translate(-50%, -50%) skewX(0deg)', opacity: 1 },
    '100%': { transform: 'translate(120vw, -50%) skewX(12deg)', opacity: 0 },
  },
  '@keyframes band': {
    '0%': { opacity: 0 },
    '15%': { opacity: 1 },
    '80%': { opacity: 1 },
    '100%': { opacity: 0 },
  },
  band: {
    position: 'fixed',
    left: 0,
    top: '46%',
    width: '100vw',
    height: '12vh',
    transform: 'translateY(-50%)',
    zIndex: 1180,
    pointerEvents: 'none',
    background:
      'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.65) 20%, rgba(0, 0, 0, 0.65) 80%, transparent 100%)',
    animation: '$band 1800ms ease-in-out forwards',
  },
  text: {
    position: 'fixed',
    left: '50%',
    top: '46%',
    zIndex: 1181,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    fontFamily: 'font1',
    fontWeight: 'bold',
    fontSize: '5vw',
    color: '#ffd84a',
    textShadow: '0 0 1.2vw rgba(255, 170, 0, 0.8), 0 0.3vw 0.4vw #000',
    animation: '$sweep 1800ms cubic-bezier(0.2, 0.8, 0.3, 1) forwards',
  },
}));

const TITLE_ALERT = '🎲 Your turn!';

interface YourTurnProps {
  players: Player[];
  playerTurn: number;
  turnNumber: number;
  isGameOver: boolean;
  // This screen's player in a multiplayer game; undefined on a single screen,
  // where every turn gets the avatar pulse but no banner
  myPlayerId?: string;
  decks: AnimCardDecks;
}

// Announces a new turn: a banner sweeping across, the player's avatar
// pulsing, and in multiplayer the tab title flashing while the tab is hidden
export default function YourTurn({
  players,
  playerTurn,
  turnNumber,
  isGameOver,
  myPlayerId,
  decks,
}: YourTurnProps) {
  const classes = useStyles();
  const [banner, setBanner] = useState<{ key: number; text: string } | null>(
    null
  );
  const lastTurnRef = useRef<number | null>(null);
  // Read when the banner is due, as the game can end on the same move
  const latest = useRef({ isGameOver });
  latest.current = { isGameOver };

  useEffect(() => {
    if (players.length === 0) return;
    const firstSeen = lastTurnRef.current === null;
    if (turnNumber === lastTurnRef.current) return;
    lastTurnRef.current = turnNumber;
    // When the board appears only the first turn of a game is announced
    if (firstSeen && turnNumber !== 0) return;

    const player = players[playerTurn];
    const isMine = myPlayerId === undefined || player?.playerId === myPlayerId;
    if (!player || !isMine) return;

    // After the end of the last turn has settled
    const timer = setTimeout(() => {
      if (latest.current.isGameOver) return;
      // The banner is for multiplayer only; on a single screen the turn
      // label already says whose turn it is
      if (myPlayerId !== undefined) {
        setBanner({ key: turnNumber, text: 'Your turn!' });
      }

      const avatar =
        decks.kingdomSmall[playerTurn]?.current?.parentElement?.querySelector(
          'img'
        );
      avatar?.animate(
        [
          { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255, 216, 74, 0)' },
          {
            transform: 'scale(1.15)',
            boxShadow: '0 0 1.5vw 0.5vw rgba(255, 216, 74, 0.9)',
          },
          { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255, 216, 74, 0)' },
        ],
        { duration: 600, iterations: 3, easing: 'ease-in-out' }
      );

      if (myPlayerId !== undefined && document.hidden) flashTitle();
    }, 300);
    return () => clearTimeout(timer);
  }, [turnNumber, players.length]);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 1900);
    return () => clearTimeout(timer);
  }, [banner]);

  if (!banner) return null;
  return createPortal(
    (
      <>
        <div key={`band-${banner.key}`} className={classes.band} />
        <div key={`text-${banner.key}`} className={classes.text}>
          {banner.text}
        </div>
      </>
    ) as any,
    // On document.body, above the board; the cast is for @types/react-dom,
    // which brings its own newer @types/react
    document.body
  );
}

let flashing = false;

// Swaps the tab title with TITLE_ALERT every second until the tab is
// looked at again
function flashTitle() {
  if (flashing) return;
  flashing = true;
  const original = document.title;
  let alert = true;
  document.title = TITLE_ALERT;
  const interval = setInterval(() => {
    alert = !alert;
    document.title = alert ? TITLE_ALERT : original;
  }, 1000);
  const stop = () => {
    if (document.hidden) return;
    clearInterval(interval);
    document.title = original;
    flashing = false;
    document.removeEventListener('visibilitychange', stop);
  };
  document.addEventListener('visibilitychange', stop);
}
