// The animation timers use a web worker Jest can't load; these tests don't animate
jest.mock('hooks/useAnimateCards', () => ({
  animationStarted: async () => {},
  animationFinished: async () => {},
}));

import calculateScore from './calculateScore';
import endOfGame from './endOfGame';
import replaceSlots from './replaceSlots';
import Card from 'model/Card';
import { CityCardSlot, Player } from 'state/State';

const card = (points: number, color = 'purple', specialEffect = ''): Card =>
  ({ points, color, specialEffect, picture: '', condition: '' } as any);

const player = (name: string, deck: Card[]): Player => ({
  name,
  deck,
  points: 0,
  avatar: '',
  playerId: name,
});

const run = async (thunk) => {
  const actions: any[] = [];
  await thunk((action) => actions.push(action), () => ({}));
  return actions;
};

describe('calculateScore', () => {
  it('does not reorder the players', async () => {
    const players = [player('low', [card(1)]), player('high', [card(5)])];
    await run(calculateScore(true, true, players));
    expect(players.map((p) => p.name)).toEqual(['low', 'high']);
  });

  it('picks the highest score', async () => {
    const players = [player('low', [card(1)]), player('high', [card(5)])];
    const actions = await run(calculateScore(true, true, players));
    const winner = actions.find((a) => a.type === 'updateHighestScorePlayer');
    expect(winner.payload.highestPlayer.name).toBe('high');
  });

  it('breaks a tie by the fewest minus points', async () => {
    const players = [
      // 6 - 3 = 3
      player('more minus', [card(6), card(3, 'penalty')]),
      // 4 - 1 = 3
      player('less minus', [card(4), card(1, 'penalty')]),
    ];
    const actions = await run(calculateScore(true, true, players));
    const winner = actions.find((a) => a.type === 'updateHighestScorePlayer');
    expect(winner.payload.highestPlayer.name).toBe('less minus');
  });
});

describe('endOfGame', () => {
  const stacks = (...sizes: number[]): CityCardSlot[] =>
    sizes.map((n) => ({ isHighlighted: false, cards: Array.from({ length: n }, () => card(1)) }));

  const ends = async (citizen: number, penalty: number, city: CityCardSlot[]) => {
    const actions = await run(
      endOfGame(Array(penalty).fill(card(-1)), Array(citizen).fill(card(1)), city)
    );
    return actions.find((a) => a.type === 'endGame');
  };

  it('keeps going while every pile has cards', async () => {
    expect(await ends(10, 5, stacks(3, 3, 3, 3, 3))).toBeUndefined();
  });

  it('ends when any village stack is empty, not only the last one', async () => {
    expect((await ends(10, 5, stacks(3, 0, 3, 3, 3))).reason).toBe('A village stack is empty');
  });

  it('ends when the penalty pile is empty', async () => {
    expect((await ends(10, 0, stacks(3, 3, 3, 3, 3))).reason).toBe('The penalty pile is empty');
  });

  it('ends when the citizen pile is empty', async () => {
    expect((await ends(0, 5, stacks(3, 3, 3, 3, 3))).reason).toBe('The citizen pile is empty');
  });
});

describe('replaceSlots', () => {
  it('leaves a slot empty instead of crashing when the citizen pile is empty', async () => {
    const slots = Array.from({ length: 5 }, () => ({ isHighlighted: false, card: null }));
    await expect(run(replaceSlots(slots, []))).resolves.toBeDefined();
    expect(slots.every((s) => s.card === null)).toBe(true);
  });
});
