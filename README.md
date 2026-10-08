# Dice King

## Multiplayer: Firestore cleanup

Rooms and WebRTC signaling live in Firestore under `rooms/{roomId}`. The host
deletes its room when it leaves through the UI, but a closed tab can't finish
async work, so every doc also carries an `expireAt` timestamp (the host pushes
the room's forward every minute while it's alive). Turn on a TTL policy for each
collection group so Firestore deletes leftovers on its own:

```sh
for group in rooms signals answers callerCandidates calleeCandidates; do
  gcloud firestore fields ttls update expireAt \
    --collection-group=$group --enable-ttl --project=dice-king-server
done
```

TTL deletion can lag up to 24h after expiry. Guests already refuse rooms whose
`expireAt` has passed, so a stale room can't be joined in the meantime.

## Tests

**Unit tests** (signaling logic with fake Firestore/WebRTC, a few seconds):

```sh
npm test
```

**End-to-end tests** (real Chrome windows playing against each other over real
WebRTC, with a local Firestore emulator; never touches the live project):

```sh
npx playwright install chromium   # once
npm run e2e                       # all scenarios, ~2 min
npm run e2e:headed                # same, with visible browser windows
npm run e2e -- -g "host closing"  # one scenario by name
npm run e2e:turn                  # force all traffic through the TURN servers
npx playwright show-report        # HTML report; failed tests keep a trace
```

The first run starts the emulator (needs Java) and the dev server on port 3100
by itself, on port 8095 so it never touches the emulator you play with.
`E2E_LOGS=1` prints every player's browser console.

## Playing locally

```sh
npm run emulator      # terminal 1: local Firestore
npm run start:local   # terminal 2: app on localhost:3000 using the local Firestore
```

Open one browser tab per player: host clicks Multiplayer → Create Lobby →
Copy, guests paste the Room ID and click Join Lobby.

## Game data

Everything the game shows ships with the app; there is no card API any more.

- `src/data/cards.json`: all 65 cards (15 village, 10 penalty, 40 citizen) and the 6 dice
- `public/images/`: card images, card backs, avatars, icons and backgrounds
- `public/*.mp3`, `public/king-of-the-dice-rulebook.pdf`, fonts from `@fontsource/roboto`

To change a card, edit `cards.json` (image paths are relative to `public/`).
Only multiplayer still uses the network: Firebase to find the other players,
and the TURN servers when players can't connect directly.

# Create React App example with TypeScript

## How to use

Download the example [or clone the repo](https://github.com/mui-org/material-ui):

```sh
curl https://codeload.github.com/mui-org/material-ui/tar.gz/master | tar -xz --strip=2 material-ui-master/examples/create-react-app-with-typescript
cd create-react-app-with-typescript
```

Install it and run:

```sh
npm install
npm start
```

or:

[![Edit on CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/github/mui-org/material-ui/tree/master/examples/create-react-app-with-typescript)

## The idea behind the example

This example demonstrates how you can use [Create React App](https://github.com/facebookincubator/create-react-app) with [TypeScript](https://github.com/Microsoft/TypeScript).
