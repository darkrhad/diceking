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
