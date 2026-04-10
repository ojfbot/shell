/**
 * Visual Regression Tests for Shell
 *
 * Covers home screen, app switcher, deep links (blogengine, tripplanner,
 * cv-builder), breadcrumb navigation, theme toggle, settings modal,
 * and responsive viewports (mobile + tablet).
 */

import { createTestSuite, createTestRunner } from '../../src/test-runner/index.js';
import { VisualDiffReporter } from '../../src/test-runner/reporters/VisualDiffReporter.js';
import { GitHubPRReporter } from '../../src/test-runner/reporters/GitHubPRReporter.js';
import { createVisualAssertions } from '../../src/test-runner/assertions/visual.js';
import { VISUAL_THRESHOLDS } from '../../src/visual/constants.js';

const API_URL = process.env.API_URL || 'http://localhost:4002';
const APP_URL = process.env.BROWSER_APP_URL || 'http://localhost:4000';
const UPDATE_BASELINES = process.env.UPDATE_BASELINES === 'true';
const GITHUB_RUN_ID = process.env.GITHUB_RUN_ID;
const GITHUB_RUN_NUMBER = process.env.GITHUB_RUN_NUMBER;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

const SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR
  ? `${process.env.SCREENSHOTS_DIR}/visual-test`
  : 'temp/screenshots/visual-test';

if (UPDATE_BASELINES) {
  console.log('');
  console.log('UPDATE_BASELINES=true - All baselines will be updated');
  console.log('WARNING: This will overwrite existing baselines!');
  console.log('');
}

async function main() {
  const { suite, client } = createTestSuite(
    'Shell Visual Regression',
    API_URL
  );

  const visualReporter = new VisualDiffReporter('./temp/test-results');
  const visual = createVisualAssertions('shell-visual', visualReporter);

  // Suite setup -- wait for app to be ready
  suite.beforeAll(async () => {
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`Retry attempt ${attempt}/${maxRetries}...`);
        }

        await client.navigate(APP_URL);
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          await client.waitForSelector('[data-element="app-container"]', { timeout: 15000 });
        } catch {
          await client.waitForSelector('.app-container', { timeout: 15000 });
        }
        console.log('Shell loaded');
        return;
      } catch (error) {
        lastError = error as Error;
        console.log(`Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }

    throw new Error(`Failed to load Shell after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  });

  // -- Home Screen --------------------------------------------------------

  suite.test('Home Screen - Initial Load (Desktop)', async ({ assert }) => {
    await client.navigate(APP_URL);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const result = await client.screenshot({
      name: 'home-screen-initial',
      viewport: 'desktop',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'home-screen-initial-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // -- App Switcher -------------------------------------------------------

  suite.test('App Switcher - Open Sidebar', async ({ assert }) => {
    await client.navigate(APP_URL);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const sidebarToggleExists = await client.elementExists('[data-element="sidebar-toggle"]');
    if (sidebarToggleExists) {
      await client.click('[data-element="sidebar-toggle"]');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const result = await client.screenshot({
      name: 'app-switcher-open',
      viewport: 'desktop',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'app-switcher-open-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // -- Deep Links ---------------------------------------------------------

  suite.test('Deep Link - BlogEngine', async ({ assert }) => {
    await client.navigate(`${APP_URL}/?app=blogengine`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    const result = await client.screenshot({
      name: 'deep-link-blogengine',
      viewport: 'desktop',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'deep-link-blogengine-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  suite.test('Deep Link - TripPlanner', async ({ assert }) => {
    await client.navigate(`${APP_URL}/?app=tripplanner`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    const result = await client.screenshot({
      name: 'deep-link-tripplanner',
      viewport: 'desktop',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'deep-link-tripplanner-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  suite.test('Deep Link - CV Builder', async ({ assert }) => {
    await client.navigate(`${APP_URL}/?app=resume_builder`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    const result = await client.screenshot({
      name: 'deep-link-cv-builder',
      viewport: 'desktop',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'deep-link-cv-builder-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // -- Breadcrumb Navigation ----------------------------------------------

  suite.test('Breadcrumb Navigation', async ({ assert }) => {
    // Navigate to a deep link first to trigger breadcrumb
    await client.navigate(`${APP_URL}/?app=blogengine`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const result = await client.screenshot({
      name: 'breadcrumb-navigation',
      viewport: 'desktop',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'breadcrumb-navigation-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // -- Theme Toggle -------------------------------------------------------

  suite.test('Theme Toggle', async ({ assert }) => {
    await client.navigate(APP_URL);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const themeToggleExists = await client.elementExists('[data-element="theme-toggle"]');
    if (themeToggleExists) {
      await client.click('[data-element="theme-toggle"]');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const result = await client.screenshot({
      name: 'theme-toggle',
      viewport: 'desktop',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'theme-toggle-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });

    // Toggle back
    if (themeToggleExists) {
      await client.click('[data-element="theme-toggle"]');
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  });

  // -- Settings Modal -----------------------------------------------------

  suite.test('Settings Modal', async ({ assert }) => {
    await client.navigate(APP_URL);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const settingsExists = await client.elementExists('[data-element="settings-toggle"]');
    if (settingsExists) {
      await client.click('[data-element="settings-toggle"]');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const result = await client.screenshot({
      name: 'settings-modal',
      viewport: 'desktop',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'settings-modal-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });

    // Close modal
    await client.press('Escape');
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  // -- Responsive: Mobile -------------------------------------------------

  suite.test('Home Screen - Mobile', async ({ assert }) => {
    await client.navigate(APP_URL);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const result = await client.screenshot({
      name: 'home-screen-mobile',
      viewport: 'mobile',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'home-screen-mobile', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  suite.test('App Switcher - Mobile', async ({ assert }) => {
    await client.navigate(APP_URL);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const sidebarToggleExists = await client.elementExists('[data-element="sidebar-toggle"]');
    if (sidebarToggleExists) {
      await client.click('[data-element="sidebar-toggle"]');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const result = await client.screenshot({
      name: 'app-switcher-mobile',
      viewport: 'mobile',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'app-switcher-mobile', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // -- Responsive: Tablet -------------------------------------------------

  suite.test('Home Screen - Tablet', async ({ assert }) => {
    await client.navigate(APP_URL);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const result = await client.screenshot({
      name: 'home-screen-tablet',
      viewport: 'tablet',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'home-screen-tablet', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // -- Run ----------------------------------------------------------------

  const reporters: any[] = ['console', visualReporter];

  if (GITHUB_RUN_ID) {
    reporters.push(
      new GitHubPRReporter({
        outputPath: './temp/test-results/github-pr-comment.md',
        runId: GITHUB_RUN_ID,
        runNumber: GITHUB_RUN_NUMBER,
        repository: GITHUB_REPOSITORY,
      })
    );
  }

  const runner = createTestRunner({
    reporters,
    verbose: true,
  });

  const result = await runner.run(suite);
  const exitCode = result.summary.failed > 0 ? 1 : 0;

  console.log('');
  console.log(`Shell Visual Regression: ${exitCode === 0 ? 'PASSED' : 'FAILED'}`);
  console.log(`  ${result.summary.passed} passed, ${result.summary.failed} failed, ${result.summary.skipped} skipped`);
  console.log('');

  process.exit(exitCode);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
