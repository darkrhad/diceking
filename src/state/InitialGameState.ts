import { DiceColors, GameState } from './State';

const initalGameState: GameState = {
  player: [],
  playerTurn: 0,
  diceTurns: 3,
  initalDiceRolls: 3,
  dices: [],
  discardDeck: [],
  penaltyCardDeck: [],
  cityCardSlots: [],
  citizenCardSlots: [],
  endTurnEnabled: true,
  isDragonPopUp: false,
  gameInfo: {
    citizenCards: [],
    cityCards: [],
    penaltyCards: [],
    dices: [],
  },
  citizenCardDeck: [],
  dragonFire: { target: 0, points: 0, start: 0 },
  cardEffect: { kind: 'village', target: 0, points: 0, start: 0 },
  animCardParams: {
    fromDeck: 'citizen',
    toDeck: 'citizen',
    toSlot: 0,
    fromSlot: 0,
    start: 0,
  }
};

export default initalGameState;
