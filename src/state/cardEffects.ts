import Card from 'model/Card';

// The effect played when a card lands in a player's kingdom. The dragon has
// its own (DragonFire); Crazy Gnomes have none.
export type CardEffectKind =
  | 'dwarf'
  | 'orc'
  | 'snob'
  | 'elf'
  | 'fairy'
  | 'sorcerer'
  | 'mushroom'
  | 'hypnotist'
  | 'scoundrel'
  | 'village';

// Every screen plays it when start goes up
export interface CardEffect {
  kind: CardEffectKind;
  // Index in state.player of whose kingdom the card went to
  target: number;
  points: number;
  // A village card's color
  color?: string;
  // Fairies in the kingdom now, counting this one (they score squared)
  combo?: number;
  start: number;
}

export function citizenEffect(card: Card): CardEffectKind | null {
  switch (card.specialEffect) {
    case 'Fairy':
      return 'fairy';
    case 'Sorcerer':
      return 'sorcerer';
    case 'Mushroom':
      return 'mushroom';
    case 'Hypnotist':
      return 'hypnotist';
    case 'Snob':
      return 'snob';
    case 'Arrogant':
      return 'elf';
  }
  switch (card.color) {
    case 'brown':
      return 'dwarf';
    case 'green':
      return 'orc';
  }
  return null;
}

// The action that starts one
export const cardEffect = (payload: Omit<CardEffect, 'start' | 'combo'>) => ({
  type: 'cardEffect',
  payload,
});
