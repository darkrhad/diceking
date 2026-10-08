import { test, expect } from '@playwright/test';
import {
  Player,
  clearFirestore,
  createLobby,
  expectHostLeftPopup,
  expectLobbyPlayers,
  firestorePaths,
  joinLobby,
  openPlayer,
  roomDoc,
  rollButton,
  sendRaw,
  expectBoardPlayers,
} from './helpers';

let players: Player[] = [];

const open = async (browser, name: string) => {
  const player = await openPlayer(browser, name);
  players.push(player);
  return player;
};

test.beforeEach(async () => {
  await clearFirestore();
});

test.afterEach(async () => {
  await Promise.all(players.map((p) => p.context.close().catch(() => {})));
  players = [];
});

// Host + two guests in one lobby, everyone seeing everyone.
const lobbyOfThree = async (browser) => {
  const alice = await open(browser, 'Alice');
  const bob = await open(browser, 'Bob');
  const carol = await open(browser, 'Carol');

  const roomId = await createLobby(alice);
  await joinLobby(bob, roomId);
  await expectLobbyPlayers(alice, ['Alice', 'Bob']);
  await joinLobby(carol, roomId);
  for (const p of [alice, bob, carol]) {
    await expectLobbyPlayers(p, ['Alice', 'Bob', 'Carol']);
  }
  return { alice, bob, carol, roomId };
};

test('host and two guests see each other in the lobby', async ({ browser }) => {
  const { alice, bob, carol } = await lobbyOfThree(browser);
  for (const p of [alice, bob, carol]) expect(p.alerts).toEqual([]);
});

test('game starts for everyone, dice rolls sync, and late joiners are refused', async ({ browser }) => {
  const { alice, bob, carol, roomId } = await lobbyOfThree(browser);

  await alice.page.getByRole('button', { name: 'Play (Multiplayer)' }).click();
  for (const p of [alice, bob, carol]) {
    await expect(p.page).toHaveURL(/\/playGame$/, { timeout: 30_000 });
    // Cards and images load from the internet before the board shows
    await expect(rollButton(p)).toBeVisible({ timeout: 60_000 });
  }

  // Everyone agrees whose turn it is, and only that player can roll
  const turn = await alice.page.getByText(/'s Turn$/).innerText();
  for (const p of [bob, carol]) await expect(p.page.getByText(/'s Turn$/)).toHaveText(turn);

  const current = [alice, bob, carol].find((p) => turn.startsWith(p.name));
  expect(current).toBeDefined();
  await expect(rollButton(current)).toBeEnabled();
  for (const p of [alice, bob, carol].filter((p) => p !== current)) {
    await expect(rollButton(p)).toBeDisabled();
  }

  const before = Number((await rollButton(current).innerText()).match(/\d+/)[0]);
  await rollButton(current).click();
  for (const p of [alice, bob, carol]) {
    await expect(rollButton(p)).toHaveText(`Roll (${before - 1} Left)`);
  }

  const late = await open(browser, 'Dave');
  await joinLobby(late, roomId);
  await expect.poll(() => late.alerts).toEqual(['⚠️ The game has already started.']);
});

// Starts a game of three and returns who is on turn and who isn't
const startedGame = async (browser) => {
  const { alice, bob, carol } = await lobbyOfThree(browser);
  await alice.page.getByRole('button', { name: 'Play (Multiplayer)' }).click();
  for (const p of [alice, bob, carol]) await expect(rollButton(p)).toBeVisible({ timeout: 60_000 });
  const turn = await alice.page.getByText(/'s Turn$/).innerText();
  const everyone = [alice, bob, carol];
  const current = everyone.find((p) => turn.startsWith(p.name));
  return { alice, everyone, current, others: everyone.filter((p) => p !== current) };
};

const rollsLeft = async (player: Player) =>
  Number((await rollButton(player).innerText()).match(/\d+/)[0]);

test('the host ignores a roll from a guest whose turn it is not', async ({ browser }) => {
  const { alice, everyone, others } = await startedGame(browser);
  const guest = others.find((p) => p !== alice);
  const before = await rollsLeft(alice);

  await sendRaw(guest, { type: 'ROLL_DICE', payload: {} });

  await alice.page.waitForTimeout(1000);
  for (const p of everyone) await expect(rollButton(p)).toHaveText(`Roll (${before} Left)`);
});

const endTurnButton = (player: Player) => player.page.getByRole('button', { name: 'End Turn' });

const expectTurn = async (players: Player[], name: string) => {
  for (const p of players) await expect(p.page.getByText(/'s Turn$/)).toHaveText(`${name}'s Turn`);
};

test('guests play their own turns and everyone sees the same board', async ({ browser }) => {
  const { alice, everyone } = await startedGame(browser);
  const [, bob, carol] = everyone;
  await expectTurn(everyone, 'Alice');

  await rollButton(alice).click();
  await endTurnButton(alice).click();
  await expectTurn(everyone, 'Bob');

  const before = await rollsLeft(bob);
  await rollButton(bob).click();
  for (const p of everyone) await expect(rollButton(p)).toHaveText(`Roll (${before - 1} Left)`);
  await endTurnButton(bob).click();
  await expectTurn(everyone, 'Carol');

  // Same scores everywhere
  const scores = await alice.page.getByText(/^\w+: -?\d+$/).allInnerTexts();
  for (const p of [bob, carol]) {
    await expect(p.page.getByText(/^\w+: -?\d+$/)).toHaveText(scores);
  }
});

test('guest going back to the menu is removed everywhere and its docs are deleted', async ({ browser }) => {
  const { alice, bob, carol, roomId } = await lobbyOfThree(browser);

  await bob.page.getByRole('button', { name: 'Back to Main Menu' }).click();

  await expectLobbyPlayers(alice, ['Alice', 'Carol']);
  await expectLobbyPlayers(carol, ['Alice', 'Carol']);
  // Only Carol's offer and answer are left
  await expect
    .poll(async () => (await firestorePaths()).filter((p) => /\/(signals|answers)\//.test(p)).length)
    .toBe(2);
  expect(await roomDoc(roomId)).not.toBeNull();
});

test('guest exiting a running game is removed from everyone\'s board', async ({ browser }) => {
  const { alice, bob, carol } = await lobbyOfThree(browser);
  await alice.page.getByRole('button', { name: 'Play (Multiplayer)' }).click();
  for (const p of [alice, bob, carol]) await expect(rollButton(p)).toBeVisible({ timeout: 60_000 });
  await expectBoardPlayers(bob, ['Alice', 'Bob', 'Carol']);

  await carol.page.locator('button:has(img[src*="exitIcon"])').click();

  await expectBoardPlayers(alice, ['Alice', 'Bob']);
  await expectBoardPlayers(bob, ['Alice', 'Bob']);
});

test('a guest cannot remove other players with a forged PLAYER_LEAVE', async ({ browser }) => {
  const { alice, bob, carol } = await lobbyOfThree(browser);

  // Carol claims the player list is just the host
  const hostOnly = [{ name: 'Alice', playerId: 'whatever', avatar: '' }];
  await sendRaw(carol, { type: 'PLAYER_LEAVE', payload: hostOnly });

  // The host only removes the sender
  await expectLobbyPlayers(alice, ['Alice', 'Bob']);
  await expectLobbyPlayers(bob, ['Alice', 'Bob']);
});

test('a guest cannot join a second time under another player\'s id', async ({ browser }) => {
  const { alice, carol } = await lobbyOfThree(browser);

  // Carol re-sends JOIN_GAME pretending to be a new player "Mallory"
  await sendRaw(carol, {
    type: 'JOIN_GAME',
    payload: { player: { name: 'Mallory', playerId: 'someone-else', avatar: '' } },
  });

  // Carol's connection already has a player, so nothing is added
  await alice.page.waitForTimeout(1000);
  await expectLobbyPlayers(alice, ['Alice', 'Bob', 'Carol']);
});

test('guest closing the tab is removed everywhere', async ({ browser }) => {
  const { alice, bob, carol } = await lobbyOfThree(browser);

  await carol.context.close();

  await expectLobbyPlayers(alice, ['Alice', 'Bob']);
  await expectLobbyPlayers(bob, ['Alice', 'Bob']);
});

test('host going back to the menu tells guests and deletes every room doc', async ({ browser }) => {
  const { alice, bob, carol } = await lobbyOfThree(browser);

  await alice.page.getByRole('button', { name: 'Back to Main Menu' }).click();

  await expectHostLeftPopup(bob);
  await expectHostLeftPopup(carol);
  await expect.poll(firestorePaths).toEqual([]);
});

test('host closing the tab tells guests and marks the room inactive', async ({ browser }) => {
  const { alice, bob, carol, roomId } = await lobbyOfThree(browser);

  await alice.page.close({ runBeforeUnload: true });

  await expectHostLeftPopup(bob);
  await expectHostLeftPopup(carol);
  // Sent from pagehide with a keepalive request; leftover docs are for the TTL policy
  await expect.poll(async () => (await roomDoc(roomId))?.active?.booleanValue).toBe(false);

  const late = await open(browser, 'Dave');
  await joinLobby(late, roomId);
  await expect.poll(() => late.alerts).toEqual(['❌ This room does not exist or was deleted.']);
});

test('joining a room that does not exist shows an error', async ({ browser }) => {
  const guest = await open(browser, 'Bob');
  await joinLobby(guest, 'NOROOM');
  await expect.poll(() => guest.alerts).toEqual(['❌ This room does not exist or was deleted.']);
});

test('a sixth guest is refused when the room is full', async ({ browser }) => {
  test.setTimeout(180_000);
  const host = await open(browser, 'Host');
  const roomId = await createLobby(host);

  const names = ['G1', 'G2', 'G3', 'G4', 'G5'];
  for (const name of names) {
    await joinLobby(await open(browser, name), roomId);
  }
  await expectLobbyPlayers(host, ['Host', ...names]);

  const extra = await open(browser, 'G6');
  await joinLobby(extra, roomId);
  await expect.poll(() => extra.alerts).toEqual(['⚠️ The room is full']);
});
