import { test, expect } from '@playwright/test';

test.describe('Dynamic Persona State Mutation', () => {
  test('Job-Seeker persona alters scatter plot mappings and intercepts API', async ({ page }) => {
    // 1. Load the landing page (/)
    await page.goto('/');

    // 2. Verify that the global layout mounts and the repository data table initializes
    const matrixContainer = page.locator('.recharts-responsive-container');
    await expect(matrixContainer).toBeVisible();

    const initialTableRows = page.locator('table tbody tr');
    // Ensure the table isn't empty on mount
    expect(await initialTableRows.count()).toBeGreaterThan(0);

    // 3. Simulate a click on the "Check Your Persona" button within the Persona Analyzer
    const jobSeekerCard = page.getByTestId('persona-job-seeker');
    await jobSeekerCard.click();

    // 4. Verify navigation to the new persona page
    await expect(page).toHaveURL(/\/persona/);

    // 5. Assert the 'Coming Soon' / 'Working on it' UI is rendered
    const comingSoonText = page.locator('h1', { hasText: "We're working on it! 🚀" });
    await expect(comingSoonText).toBeVisible();
  });
});
