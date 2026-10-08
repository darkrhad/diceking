import React, { useEffect, useRef } from 'react';
import { useSpring, config, SpringValue } from '@react-spring/web';
import { AnimCardParams, CardDeckType } from 'state/State';

let animStartedCallback: (args: void) => void = () => {};
let animFinishedCallback: (args: void) => void = () => {};

let worker: Worker | null = null;
let animationDuration: number = 0.0;

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./timerWorker.js", import.meta.url));
  }
  return worker;
}


export const animationStarted = () => {

  const w = getWorker();
  return new Promise<void>((resolve) => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "startDone") {
        w.removeEventListener("message", handler);
        resolve();
      }
    };
    w.addEventListener("message", handler);
    w.postMessage({ type: "start", duration: 0 });
  });
  
}

export const animationFinished = () => {

  const w = getWorker();
  return new Promise<void>((resolve) => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "finishDone") {
        w.removeEventListener("message", handler);
        resolve();
      }
    };
    w.addEventListener("message", handler);
    w.postMessage({ type: "finish", duration: animationDuration - 50  });
  });
}

export interface AnimCard {
  x: SpringValue<number>;
  fromLeft: number;
  fromTop: number;
  toLeft: number;
  toTop: number;
}

export interface AnimCardDecks {
  citizen: React.MutableRefObject<HTMLDivElement | undefined>;
  kingdom: React.MutableRefObject<HTMLDivElement | undefined>;
  penalty: React.MutableRefObject<HTMLDivElement | undefined>;
  discard: React.MutableRefObject<HTMLDivElement | undefined>;
  citizenSlots: React.MutableRefObject<HTMLDivElement | undefined>[];
  citySlots: React.MutableRefObject<HTMLDivElement | undefined>[];
  kingdomSmall: React.MutableRefObject<HTMLDivElement | undefined>[];
}

export default function useAnimatedCard(
  params: AnimCardParams,
  dispatch: React.Dispatch<any>
): [AnimCardDecks, AnimCard] {
  const citizen = useRef<HTMLDivElement>(null);
  const kingdom = useRef<HTMLDivElement>(null);
  const penalty = useRef<HTMLDivElement>(null);
  const discard = useRef<HTMLDivElement>(null);

  const kingdomSmall0 = useRef<HTMLDivElement>(null);
  const kingdomSmall1 = useRef<HTMLDivElement>(null);
  const kingdomSmall2 = useRef<HTMLDivElement>(null);
  const kingdomSmall3 = useRef<HTMLDivElement>(null);
  const kingdomSmall4 = useRef<HTMLDivElement>(null);
  const kingdomSmall5 = useRef<HTMLDivElement>(null);

  const citizenSlots0 = useRef<HTMLDivElement>(null);
  const citizenSlots1 = useRef<HTMLDivElement>(null);
  const citizenSlots2 = useRef<HTMLDivElement>(null);
  const citizenSlots3 = useRef<HTMLDivElement>(null);
  const citizenSlots4 = useRef<HTMLDivElement>(null);

  const citySlots0 = useRef<HTMLDivElement>(null);
  const citySlots1 = useRef<HTMLDivElement>(null);
  const citySlots2 = useRef<HTMLDivElement>(null);
  const citySlots3 = useRef<HTMLDivElement>(null);
  const citySlots4 = useRef<HTMLDivElement>(null);

  animationDuration = params.duration;

  const { x } = useSpring({
    from: { x: 0 },
    to: { x: 1 },
    config: { ...config.default, duration: params.duration },
    onRest: {
      x: (result) => {
        if(result.finished) {
          animFinishedCallback();
          dispatch({
            type: 'setAnimationActive',
            payload: false,
          })
        }
      }
    },
    onStart: {
      x: (result) => {
        animStartedCallback();
        dispatch({
          type: 'setAnimationActive',
          payload: true,
        })
      }
    }

      
    
  });

  useEffect(() => {
    x.finish();
  }, []);

  useEffect(() => {
    if (params.start > 0) {
      x.reset();
    }
  }, [params.start]);

  let citizenSlots = [
    citizenSlots0,
    citizenSlots1,
    citizenSlots2,
    citizenSlots3,
    citizenSlots4,
  ];

  let kingdomSmall = [
    kingdomSmall0,
    kingdomSmall1,
    kingdomSmall2,
    kingdomSmall3,
    kingdomSmall4,
    kingdomSmall5,
  ];

  let citySlots = [citySlots0, citySlots1, citySlots2, citySlots3, citySlots4];

  function deck(type: CardDeckType, slot: number): HTMLDivElement | undefined {
    switch (type) {
      case 'citizen':
        return citizen.current;
      case 'kingdom':
        return kingdom.current;
      case 'penalty':
        return penalty.current;
      case 'discard':
        return discard.current;
      case 'citizenSlots':
        return citizenSlots[slot].current;
      case 'citySlots':
        return citySlots[slot].current;
      case 'kingdomSmall':
        return kingdomSmall[slot].current;
    }
  }

  let fromDeck = deck(params.fromDeck, params.fromSlot ?? 0);
  let toDeck = deck(params.toDeck, params.toSlot ?? 0);

  const fromLeft: number = fromDeck?.offsetLeft ?? 0;
  const fromTop: number = fromDeck?.offsetTop ?? 0;

  const toLeft: number = toDeck?.offsetLeft ?? 0;
  const toTop: number = toDeck?.offsetTop ?? 0;

  return [
    {
      citizen,
      kingdom,
      penalty,
      discard,
      citizenSlots,
      citySlots,
      kingdomSmall,
    },
    { x, fromLeft, fromTop, toLeft, toTop },
  ];
}
