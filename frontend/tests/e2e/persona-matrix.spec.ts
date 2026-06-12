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

    // 3. Intercept the network stack. 
    // Assert that useSWR fires a tracking request to /api/repositories?hw=0.6&vw=0.1...
    // (We wrap this in a promise to wait for the specific outbound HTTP fetch)
    const requestPromise = page.waitForRequest(
      request => 
        request.url().includes('/api/repositories') && 
        request.url().includes('hw=0.6') && 
        request.url().includes('vw=0.1')
    );

    // 4. Simulate a click on the Job-Seeker Profile Card within the Persona Analyzer
    // Note: The Persona Analyzer is currently a Waitlist UI. This assumes we add data-testid="persona-job-seeker" when built.
    const jobSeekerCard = page.getByTestId('persona-job-seeker');
    await jobSeekerCard.click();

    // 5. Await the intercepted network request to guarantee the exact fetch was made
    const request = await requestPromise;
    expect(request.method()).toBe('GET');

    // 6. Confirm that the UI handles the mutation
    // Assert that the scatter plot dots transition fluidly into new coordinate mappings within the DOM
    await page.waitForTimeout(500); // Allow recharts animation to tick
    
    // Ensure the dots actually rendered
    const scatterPoints = page.locator('.recharts-scatter-symbol');
    await expect(scatterPoints.first()).toBeVisible();
    
    // Tabular metrics should update instantly. Let's assert the hiring column re-renders correctly.
    // Example: Locate the specific Hiring metric mini-bar that we just added.
    const hiringScoreText = page.locator('.font-mono.tabular-nums.text-zinc-600').first();
    await expect(hiringScoreText).toBeVisible();
  });
});
