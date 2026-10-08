import { GameState } from '../state/State';
import GameInfo from '../model/GameInfo';
import { isLabeledStatement } from 'typescript';

export function shuffle(array) {
  var i = 0,
    j = 0,
    temp = null;

  for (i = array.length - 1; i > 0; i -= 1) {
    j = Math.floor(Math.random() * (i + 1));
    temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

export function generateRoomId(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function rollDie() {
  let roll = Math.floor(Math.random() * 6) + 1;
}

export function hasEmptyElement(array) {
  for (var i = 0; i < array.length; i++) {
    if (!(i in array)) {
      return true;
    }
  }
  return false;
}
