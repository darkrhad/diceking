import Card from './Card';
import DiceInfo from './diceInfo';

export default interface GameInfo {
  citizenCards: Card[];
  cityCards: Card[];
  penaltyCards: Card[];
  dices: DiceInfo[];
}
