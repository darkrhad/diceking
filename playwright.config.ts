import { defineConfig, devices } from '@playwright/test';

// Its own emulator port (see e2e/firebase.json), so the tests, which wipe the
// database before each test, never touch the one used for playing locally.
export const EMULATOR_PORT = 8095;
const APP_PORT = 3100;

// FORCE_TURN=true npm run e2e routes every WebRTC connection through the
// TURN servers (needs internet; checks the TURN credentials still work).
const forceTurn = process.env.FORCE_TURN === 'true';

export default defineConfig({
  testDir: './e2e',
  // All tests share one emulator, which is wiped before each test
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    viewport: { width: 1600, height: 900 },
    launchOptions: {
      // Without this Chrome hides local IPs behind mDNS names, which some
      // machines can't resolve, so players on the same machine never connect.
      args: ['--disable-features=WebRtcHideLocalIpsWithMdns'],
    },
  },
  webServer: [
    {
      command:
        'npx firebase emulators:start --only firestore --project demo-dice-king --config e2e/firebase.json',
      port: EMULATOR_PORT,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npx react-scripts start',
      url: `http://localhost:${APP_PORT}`,
      reuseExistingServer: false,
      timeout: 240_000,
      env: {
        BROWSER: 'none',
        PORT: String(APP_PORT),
        REACT_APP_USE_EMULATOR: 'true',
        REACT_APP_EMULATOR_PORT: String(EMULATOR_PORT),
        REACT_APP_FORCE_TURN: String(forceTurn),
      },
    },
  ],
});
