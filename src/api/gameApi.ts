import GameInfo from 'model/GameInfo';
import cards from 'data/cards.json';

// The card data ships with the app (src/data/cards.json) and the card images
// are served from public/images, so the game doesn't depend on a remote API.
// Async so a remote source could be swapped back in without touching callers.
export default function fetchCards(): Promise<GameInfo> {
  // A fresh copy every time, like the API returned: the game changes card
  // arrays in place, and a new game must not start from the last one's state.
  return Promise.resolve(JSON.parse(JSON.stringify(cards)) as GameInfo);
}
