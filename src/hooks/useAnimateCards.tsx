import React, { CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimCardParams, CardDeckType } from 'state/State';

// ---------------------------------------------------------------------------
// Waiting for the flying card
//
// Actions dispatch setAnimCardParams, then wait for the card to take off
// (animationStarted) and land (animationFinished) before moving it in the
// state. Both resolve on the real animation, or after a fallback on a worker
// clock: a background tab pauses animations, and the host must not stop
// the game because its tab is hidden.
// ---------------------------------------------------------------------------

// Longest flight (a card from the citizen pile)
const MAX_DURATION = 700;

type Waiter = () => void;
const startedWaiters: Waiter[] = [];
const finishedWaiters: Waiter[] = [];

const settle = (waiters: Waiter[]) => waiters.splice(0).forEach((waiter) => waiter());

let worker: Worker | null = null;
let nextTimerId = 0;
const timers = new Map<number, () => void>();

// setTimeout on a worker, which a background tab doesn't throttle
function workerTimeout(ms: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof Worker === 'undefined') {
      setTimeout(resolve, ms);
      return;
    }
    if (!worker) {
      worker = new Worker(new URL('./timerWorker.js', import.meta.url));
      worker.onmessage = (e: MessageEvent) => {
        timers.get(e.data.id)?.();
        timers.delete(e.data.id);
      };
    }
    const id = ++nextTimerId;
    timers.set(id, resolve);
    worker.postMessage({ id, duration: ms });
  });
}

function waitFor(waiters: Waiter[], fallback: number) {
  return new Promise<void>((resolve) => {
    waiters.push(resolve);
    workerTimeout(fallback).then(() => resolve());
  });
}

export const animationStarted = () => waitFor(startedWaiters, 300);

export const animationFinished = () => waitFor(finishedWaiters, MAX_DURATION + 500);

// ---------------------------------------------------------------------------
// Where cards fly from and to
// ---------------------------------------------------------------------------

type DeckRef = React.RefObject<HTMLDivElement>;

export interface AnimCardDecks {
  citizen: DeckRef;
  kingdom: DeckRef;
  penalty: DeckRef;
  discard: DeckRef;
  citizenSlots: DeckRef[];
  citySlots: DeckRef[];
  kingdomSmall: DeckRef[];
}

const refs = (count: number) => Array.from({ length: count }, () => React.createRef<HTMLDivElement>());

export function useCardDecks(): AnimCardDecks {
  const [decks] = useState<AnimCardDecks>(() => ({
    citizen: React.createRef(),
    kingdom: React.createRef(),
    penalty: React.createRef(),
    discard: React.createRef(),
    citizenSlots: refs(5),
    citySlots: refs(5),
    // One per player
    kingdomSmall: refs(6),
  }));
  return decks;
}

function deckElement(decks: AnimCardDecks, type: CardDeckType, slot = 0) {
  switch (type) {
    case 'citizen':
      return decks.citizen.current;
    case 'kingdom':
      return decks.kingdom.current;
    case 'penalty':
      return decks.penalty.current;
    case 'discard':
      return decks.discard.current;
    case 'citizenSlots':
      return decks.citizenSlots[slot]?.current;
    case 'citySlots':
      return decks.citySlots[slot]?.current;
    case 'kingdomSmall':
      return decks.kingdomSmall[slot]?.current;
  }
}

// ---------------------------------------------------------------------------
// The flying card
// ---------------------------------------------------------------------------

interface FlyingCardProps {
  params: AnimCardParams;
  decks: AnimCardDecks;
  style: CSSProperties;
  // A village card is landscape and turns upright on the way
  cityStyle: CSSProperties;
  imgClassName: string;
}

// Plays every flight asked for in params (each one bumps params.start), one
// after another. Positions are measured when a flight takes off, and only
// this component re-renders while a card is in the air.
export function FlyingCard({ params, decks, style, cityStyle, imgClassName }: FlyingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const queueRef = useRef<AnimCardParams[]>([]);
  // The flight already in the state when the board appears is not replayed
  const lastStartRef = useRef(params.start);
  const [flight, setFlight] = useState<AnimCardParams | null>(null);
  // The flight in the air, updated at once: the next one is often asked for
  // right after one lands, before React has rendered
  const flightRef = useRef<AnimCardParams | null>(null);

  const flyNext = () => {
    flightRef.current = queueRef.current.shift() ?? null;
    setFlight(flightRef.current);
  };

  useEffect(() => {
    if (params.start === lastStartRef.current) return;
    lastStartRef.current = params.start;
    queueRef.current.push(params);
    if (!flightRef.current) flyNext();
  }, [params.start]);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!flight || !card) return;

    const container = (card.offsetParent ?? document.body).getBoundingClientRect();
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    const from = deckElement(decks, flight.fromDeck, flight.fromSlot);
    const to = deckElement(decks, flight.toDeck, flight.toSlot) ?? from;

    // Centred on the deck and scaled to its size
    const placeOn = (deck: HTMLElement | null | undefined, rotation: number) => {
      if (!deck) return `rotate(${rotation}deg)`;
      const rect = deck.getBoundingClientRect();
      const scale = Math.max(rect.width, rect.height) / Math.max(width, height) || 1;
      const x = rect.left + rect.width / 2 - container.left - width / 2;
      const y = rect.top + rect.height / 2 - container.top - height / 2;
      return `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`;
    };

    const rotation = flight.fromDeck === 'citySlots' ? -90 : 0;
    const animation = card.animate(
      [{ transform: placeOn(from, 0) }, { transform: placeOn(to, rotation) }],
      { duration: flight.duration ?? 500, easing: 'ease-in-out', fill: 'forwards' }
    );
    settle(startedWaiters);

    let cancelled = false;
    animation.finished
      .catch(() => {})
      .then(() => {
        if (cancelled) return;
        settle(finishedWaiters);
        flyNext();
      });
    return () => {
      cancelled = true;
      animation.cancel();
    };
  }, [flight]);

  if (!flight) return null;

  return (
    <div
      ref={cardRef}
      data-flying-card
      style={{
        ...style,
        ...(flight.fromDeck === 'citySlots' ? cityStyle : {}),
        left: 0,
        top: 0,
        pointerEvents: 'none',
        willChange: 'transform',
      }}
    >
      {flight.picture !== undefined && <img src={flight.picture} className={imgClassName} />}
    </div>
  );
}
