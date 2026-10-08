import Card from '../model/Card';
import GameInfo from '../model/GameInfo';

export interface CityCardSlot {
  cards: Card[];
  isHighlighted: boolean;
}

export interface CitizenCardSlot {
  isHighlighted: boolean;
  card: Card;
}

export type CardDeckType = 'citizen' | 'kingdom' | 'citizenSlots' | 'citySlots' | 'penalty' | 'discard' | 'kingdomSmall'

export interface AnimCardParams {
  fromDeck: CardDeckType,
  fromSlot?: number,
  toDeck: CardDeckType,
  toSlot?: number,
  start: number,
  picture?: string,
  duration?: number,
}

export enum DiceColors {
  Red = 'R',
  Blue = 'B',
  Green = 'G',
}

export interface Dice {
  color: DiceColors;
  number: number;
  isLocked: boolean;
}

export interface Player {
  name: string;
  deck: Card[];
  points: number;
  avatar: string;
  playerId: string;
}

export interface GameState {
  player: Player[];
  playerTurn: number;
  diceTurns: number;
  initalDiceRolls: number;
  isGameOver?: boolean;
  gameOverReason?: string;
  dices: Dice[];
  discardDeck: Card[];
  penaltyCardDeck: Card[];
  citizenCardDeck: Card[];
  cityCardSlots: CityCardSlot[];
  citizenCardSlots: CitizenCardSlot[];
  highestScorePlayer?: Player | null;
  gameInfo: GameInfo;
  dragonSlotIndex?: number,
  isDragonPopUp: boolean;
  dragonIndex?: number;
  animationActive: boolean;
  endTurnEnabled: boolean;
  animCardParams: AnimCardParams;
}
