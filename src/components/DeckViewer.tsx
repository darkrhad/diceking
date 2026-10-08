import { makeStyles, Typography } from '@material-ui/core';
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Player } from 'state/State';

const useStyles = makeStyles(() => ({
  '@keyframes fadeIn': {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  '@keyframes dealIn': {
    from: { opacity: 0, transform: 'translateY(6vh) scale(0.94)' },
    to: { opacity: 1, transform: 'none' },
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 1300,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at center, rgba(20, 12, 4, 0.82) 0%, rgba(0, 0, 0, 0.94) 100%)',
    backdropFilter: 'blur(4px)',
    animation: '$fadeIn 180ms ease-out',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.2vw',
    padding: '0 4vw 2vh',
    color: '#ffffff',
  },
  avatar: {
    width: '4vw',
    height: '4vw',
    borderRadius: '0.8vw',
    objectFit: 'cover',
    border: '0.2vw solid #E29700',
  },
  name: {
    fontFamily: 'font1',
    fontSize: '2vw',
    lineHeight: 1.1,
  },
  stats: {
    fontSize: '1vw',
    color: '#E2C48A',
  },
  close: {
    marginLeft: 'auto',
    width: '3vw',
    height: '3vw',
    borderRadius: '50%',
    border: '0.15vw solid #E29700',
    background: 'rgba(0, 0, 0, 0.5)',
    color: '#ffffff',
    fontSize: '1.6vw',
    lineHeight: 1,
    cursor: 'pointer',
    '&:hover': { background: '#993300' },
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5vw',
    padding: '4vh 4vw',
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollSnapType: 'x proximity',
    scrollBehavior: 'smooth',
    // Cards fade out at the edges, so it's clear the row goes on
    maskImage: 'linear-gradient(to right, transparent 0, #000 4vw, #000 calc(100% - 4vw), transparent 100%)',
    WebkitMaskImage:
      'linear-gradient(to right, transparent 0, #000 4vw, #000 calc(100% - 4vw), transparent 100%)',
    scrollbarColor: '#E29700 transparent',
  },
  card: {
    flex: '0 0 auto',
    height: '68vh',
    borderRadius: '1.2vw',
    boxShadow: '0 1vh 3vh rgba(0, 0, 0, 0.8)',
    scrollSnapAlign: 'center',
    transition: 'transform 160ms ease-out, box-shadow 160ms ease-out',
    animation: '$dealIn 260ms ease-out backwards',
    '&:hover': {
      transform: 'translateY(-3vh) scale(1.06)',
      boxShadow: '0 2vh 5vh rgba(226, 151, 0, 0.45)',
    },
  },
  empty: {
    color: '#E2C48A',
    fontSize: '1.4vw',
    textAlign: 'center',
    padding: '20vh 0',
  },
  hint: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: '0.8vw',
    textAlign: 'center',
  },
}));

interface DeckViewerProps {
  player: Player;
  onClose: () => void;
}

// A player's kingdom pile, full screen, newest card first, scrolling sideways
export default function DeckViewer({ player, onClose }: DeckViewerProps) {
  const classes = useStyles();
  const rowRef = useRef<HTMLDivElement>(null);
  const cards = player.deck ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const row = rowRef.current;
      if (e.key === 'Escape') onClose();
      else if (row && e.key === 'ArrowRight') row.scrollLeft += row.clientWidth / 3;
      else if (row && e.key === 'ArrowLeft') row.scrollLeft -= row.clientWidth / 3;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // A mouse wheel only scrolls up and down; turn that into sideways
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (rowRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      rowRef.current.scrollLeft += e.deltaY;
    }
  };

  const overlay = (
    <div
      className={classes.backdrop}
      role="dialog"
      aria-label={`${player.name}'s kingdom`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={classes.header}>
        <img src={player.avatar} className={classes.avatar} alt="" />
        <div>
          <Typography className={classes.name}>{player.name}'s kingdom</Typography>
          <Typography className={classes.stats}>
            {cards.length} {cards.length === 1 ? 'card' : 'cards'} · {player.points} points
          </Typography>
        </div>
        <button className={classes.close} onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      {cards.length === 0 ? (
        <Typography className={classes.empty}>No cards yet</Typography>
      ) : (
        <div className={classes.row} ref={rowRef} onWheel={onWheel} onClick={(e) => e.target === e.currentTarget && onClose()}>
          {cards.map((card, index) => (
            <img
              key={`${card._id ?? card.picture}-${index}`}
              src={card.picture}
              alt=""
              className={classes.card}
              style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
            />
          ))}
        </div>
      )}
      {cards.length > 0 && <Typography className={classes.hint}>Newest first · scroll or use ← → · Esc to close</Typography>}
    </div>
  );

  // On document.body, above everything on the board. The cast is for
  // @types/react-dom, which brings its own newer @types/react.
  return createPortal(overlay as any, document.body);
}
