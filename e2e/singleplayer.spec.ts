import { test, expect } from '@playwright/test';

const rollButton = (page) => page.getByRole('button', { name: /^Roll \(\d+ Left\)$/ });

test('single screen: players roll and pass the turn', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play (Single Screen)' }).click();
  await expect(rollButton(page)).toBeVisible({ timeout: 60_000 });

  const first = await page.getByText(/'s Turn$/).innerText();
  await rollButton(page).click();
  await expect(rollButton(page)).toHaveText('Roll (2 Left)');
  await rollButton(page).click();
  await expect(rollButton(page)).toHaveText('Roll (1 Left)');

  await page.getByRole('button', { name: 'End Turn' }).click();
  await expect(page.getByText(/'s Turn$/)).not.toHaveText(first);
  await expect(rollButton(page)).toHaveText(/Roll \([34] Left\)/);
});

test("clicking a player's deck opens their kingdom full screen", async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play (Single Screen)' }).click();
  await expect(rollButton(page)).toBeVisible({ timeout: 60_000 });

  // Each turn ended without a card adds a penalty card to that player's kingdom
  for (let i = 0; i < 3; i++) {
    await expect(page.getByRole('button', { name: 'End Turn' })).toBeEnabled({ timeout: 15_000 });
    await page.getByRole('button', { name: 'End Turn' }).click();
  }
  await expect(page.getByRole('button', { name: 'End Turn' })).toBeEnabled({ timeout: 15_000 });

  await page.getByTitle("See Player 1's kingdom").click();
  const viewer = page.getByRole('dialog', { name: "Player 1's kingdom" });
  await expect(viewer).toBeVisible();
  await expect(viewer.getByText(/^2 cards · -\d+ points$/)).toBeVisible();
  await expect(viewer.locator('img[src*="penaltyCards"]')).toHaveCount(2);

  await page.keyboard.press('Escape');
  await expect(viewer).toHaveCount(0);

  await page.getByTitle("See Player 2's kingdom").click();
  await expect(page.getByRole('dialog', { name: "Player 2's kingdom" })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
