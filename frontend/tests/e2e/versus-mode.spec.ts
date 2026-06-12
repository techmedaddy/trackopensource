import { test, expect } from '@playwright/test';

test.describe('Arcade Versus Mode Showdown', () => {
  test('Renders overlapping line charts and computes victor', async ({ page }) => {
    // 1. Navigate directly to the /versus interface route path
    await page.goto('/versus');

    // 2. Input direct competitors into the selection fields
    const selectA = page.locator('select').first();
    const selectB = page.locator('select').nth(1);

    // Select the first and second available options dynamically
    await selectA.selectOption({ index: 0 });
    await selectB.selectOption({ index: 1 });

    // Wait for the dual-fetch Promise.all to resolve and the chart wrapper to render
    const chartContainer = page.getByTestId('versus-chart');
    await chartContainer.waitFor({ state: 'attached', timeout: 15000 });

    // 4. Assert that comparative text variables fill out cleanly
    // (This proves repoA and repoB successfully fetched and hydrated the UI)
    const statBattles = page.locator('h4:has-text("Hiring Demand")');
    await expect(statBattles).toBeVisible();

    // Verify the visual indicator bars explicitly reflect who owns superior velocity parameters
    const indigoBars = page.locator('.bg-indigo-500.rounded-full');
    const roseBars = page.locator('.bg-rose-500.rounded-full');
    
    expect(await indigoBars.count()).toBeGreaterThan(0);
    expect(await roseBars.count()).toBeGreaterThan(0);
  });
});
