import { Browser, BrowserContext, Page, expect } from '@playwright/test';
import { EMULATOR_PORT } from '../playwright.config';

const PROJECT = 'demo-dice-king';
const EMULATOR = `http://127.0.0.1:${EMULATOR_PORT}`;
const DOCUMENTS = `${EMULATOR}/v1/projects/${PROJECT}/databases/(default)/documents`;
// "Bearer owner" makes the emulator skip security rules
const ADMIN = { Authorization: 'Bearer owner' };

const COLLECTION_GROUPS = ['rooms', 'signals', 'answers', 'callerCandidates', 'calleeCandidates'];

export async function clearFirestore() {
  const res = await fetch(`${EMULATOR}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE',
  });
  expect(res.ok).toBe(true);
}

// Every doc path in the emulator, relative to the database root, sorted.
export async function firestorePaths(): Promise<string[]> {
  const paths: string[] = [];
  for (const collectionId of COLLECTION_GROUPS) {
    const res = await fetch(`${DOCUMENTS}:runQuery`, {
      method: 'POST',
      headers: { ...ADMIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId, allDescendants: true }] } }),
    });
    const rows = await res.json();
    rows.forEach((row: any) => row.document && paths.push(row.document.name.split('/documents/')[1]));
  }
  return paths.sort();
}

export async function roomDoc(roomId: string): Promise<Record<string, any> | null> {
  const res = await fetch(`${DOCUMENTS}/rooms/${roomId}`, { headers: ADMIN });
  if (res.status === 404) return null;
  const { fields } = await res.json();
  return fields;
}

export interface Player {
  name: string;
  page: Page;
  context: BrowserContext;
  // window.alert() messages, accepted automatically
  alerts: string[];
}

export async function openPlayer(browser: Browser, name: string): Promise<Player> {
  const context = await browser.newContext();
  // Keep the game's data channels reachable, so a test can play a guest that
  // sends hand-crafted messages (see sendRaw)
  await context.addInitScript(() => {
    const create = RTCPeerConnection.prototype.createDataChannel;
    (window as any).__gameChannels = [];
    RTCPeerConnection.prototype.createDataChannel = function (...args) {
      const channel = create.apply(this, args);
      (window as any).__gameChannels.push(channel);
      return channel;
    };
  });
  const page = await context.newPage();
  const alerts: string[] = [];
  page.on('dialog', (dialog) => {
    alerts.push(dialog.message());
    dialog.accept().catch(() => {});
  });
  page.on('console', (msg) => {
    if (process.env.E2E_LOGS) console.log(`[${name}] ${msg.text()}`);
  });
  await page.goto('/');
  return { name, page, context, alerts };
}

async function openMultiplayerModal(player: Player) {
  await player.page.getByRole('button', { name: 'Multiplayer', exact: true }).click();
  await player.page.getByPlaceholder('Enter your kings/queens name').fill(player.name);
}

// Returns the room code shown in the lobby.
export async function createLobby(host: Player): Promise<string> {
  await openMultiplayerModal(host);
  await host.page.getByRole('button', { name: 'Create Lobby' }).click();
  const code = host.page.locator('h6:has-text("Room ID:") span');
  await expect(code).toHaveText(/^\w{6}$/);
  const roomId = await code.innerText();
  // Guests can only join once the host wrote the room doc
  await expect.poll(() => roomDoc(roomId)).not.toBeNull();
  return roomId;
}

export async function joinLobby(guest: Player, roomId: string) {
  await openMultiplayerModal(guest);
  await guest.page.getByPlaceholder('Enter Lobby ID (Join Lobby)').fill(roomId);
  await guest.page.getByRole('button', { name: 'Join Lobby' }).click();
}

export async function expectLobbyPlayers(player: Player, names: string[]) {
  const cards = player.page.locator('h6:has-text("Online Players") + div img + p');
  await expect(cards).toHaveText(names.filter(Boolean), { timeout: 30_000 });
}

export async function expectHostLeftPopup(player: Player) {
  await expect(player.page.getByText('Host Left', { exact: true })).toBeVisible({ timeout: 30_000 });
}

// Sends a message to the host as-is over the guest's data channel.
export async function sendRaw(guest: Player, message: object) {
  await guest.page.evaluate((json) => {
    const channel = (window as any).__gameChannels.find((c) => c.readyState === 'open');
    channel.send(json);
  }, JSON.stringify(message));
}

// Names on the game board, e.g. "Alice: 0"
export async function expectBoardPlayers(player: Player, names: string[]) {
  await expect(player.page.getByText(/^\w+: -?\d+$/)).toHaveText(
    names.map((name) => new RegExp(`^${name}: -?\\d+$`)),
    { timeout: 30_000 }
  );
}

export const rollButton = (player: Player) => player.page.getByRole('button', { name: /^Roll \(\d+ Left\)$/ });
