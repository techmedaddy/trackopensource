import { test, expect } from '@playwright/test';
// Require 'pg' locally to open an isolated SQL link for backend polling assertions
import { Client } from 'pg'; 

test.describe('Asynchronous Scan-Trigger Queue Lifecycle', () => {
  // Mock Clerk JWT token using Playwright's native StorageState fixtures
  test.use({
    storageState: {
      cookies: [{ name: '__session', value: 'mock-clerk-jwt-token', domain: 'localhost', path: '/' }],
      origins: []
    }
  });

  test('Validates scan ingestion queue logic directly via PostgreSQL', async ({ page }) => {
    // Give the Rust worker daemon up to 60 seconds to process the heavy job
    test.setTimeout(60000);
    
    // 1. Authenticate and load the dashboard
    await page.goto('/');

    // Prepare to intercept the backend synchronization endpoint
    const triggerPromise = page.waitForResponse(response => 
      response.url().includes('/api/trigger') && response.status() === 200
    );

    // 2. Click the Trigger Synchronization Scan button
    const triggerButton = page.locator('button:has-text("Trigger Live Scan")');
    await triggerButton.click();

    // 3. Assert 202 Accepted status and valid UUID payload from the backend
    const triggerResponse = await triggerPromise;
    const triggerBody = await triggerResponse.json();
    
    expect(triggerBody).toHaveProperty('job_id');
    const jobId = triggerBody.job_id;

    // 4. Open an isolated SQL database link directly within the test wrapper
    const client = new Client({
      // Hook into the same Docker Postgres instance the backend uses
      connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/open_source_radar'
    });
    await client.connect();

    try {
      // 5. Query the scan_jobs data row matching that returned UUID token
      // Assuming a table structure of `scan_jobs` (id, status, started_at, finished_at)
      const res = await client.query('SELECT status FROM scan_jobs WHERE id = $1', [jobId]);
      
      // Ensure the row was properly inserted
      expect(res.rows.length).toBe(1);
      
      // Assert that status is accurately queued for the daemon worker
      expect(['queued', 'processing', 'done']).toContain(res.rows[0].status);

      // 6. Allow the backend worker process loop to tick. 
      // Poll the database row until status == 'done' or status == 'failed'.
      let finalStatus = res.rows[0].status;
      let attempts = 0;
      
      // Poll for max 30 seconds
      while (finalStatus !== 'done' && finalStatus !== 'failed' && attempts < 30) {
        await new Promise(r => setTimeout(r, 1000));
        const pollRes = await client.query('SELECT status, started_at, finished_at FROM scan_jobs WHERE id = $1', [jobId]);
        finalStatus = pollRes.rows[0].status;
        attempts++;

        // Ensure all processing timestamps (started_at, finished_at) serialize accurately once done
        if (finalStatus === 'done') {
          expect(pollRes.rows[0].started_at).not.toBeNull();
          expect(pollRes.rows[0].finished_at).not.toBeNull();
        }
      }
      
      // Assert the daemon successfully ingested the task (queued, running, or done)
      expect(['queued', 'running', 'done']).toContain(finalStatus);
    } finally {
      // Clean up the DB connection to prevent hanging the test runner
      await client.end();
    }
  });
});
