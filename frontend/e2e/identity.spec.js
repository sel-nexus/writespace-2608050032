/** Exercise real local identity journeys; later publishing surfaces are URL boundaries only. */
import { test, expect } from './fixtures';

/** Open responsive navigation only when its mobile trigger is visible. */
async function openNavigation(page) {
  const toggle = page.getByRole('button', { name: 'Open menu' });
  if (await toggle.isVisible()) await toggle.click();
}

test('guest discovery, registration errors, writer persistence, logout and login', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByText('No posts yet — check back soon!')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Write Freely' })).toBeVisible();
  await expect(page.getByText(/Client-side access checks/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('landing.png'), fullPage: true });
  await page.getByRole('link', { name: 'Start Reading' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByText('Username is required.')).toBeVisible();
  await page.getByRole('main').getByRole('link', { name: 'Register', exact: true }).click();
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(4);
  await page.getByLabel('Display Name').fill('Journey Writer');
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password', { exact: true }).fill('demo-only');
  await page.getByLabel('Confirm Password').fill('wrong');
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page.getByText('Username is already taken.')).toBeVisible();
  await expect(page.getByText('Passwords must match.')).toBeVisible();
  await page.getByLabel('Username').fill('journey-writer');
  await page.getByLabel('Confirm Password').fill('demo-only');
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  await expect(page.getByRole('heading', { name: 'All Blogs', exact: true })).toBeVisible();
  const account = await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_users'))[0]);
  expect(account).toMatchObject({ username: 'journey-writer', role: 'user' });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'All Blogs', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Account options/ }).click();
  await page.getByRole('button', { name: 'Logout' }).click();
  expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBeNull();
  await page.getByRole('link', { name: 'Get Started Free' }).click();
  await page.getByLabel('Display Name').fill('Duplicate');
  await page.getByLabel('Username').fill('journey-writer');
  await page.getByLabel('Password', { exact: true }).fill('demo-only');
  await page.getByLabel('Confirm Password').fill('demo-only');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText('Username is already taken.')).toBeVisible();
  await page.getByRole('main').getByRole('link', { name: 'Login', exact: true }).click();
  await page.getByLabel('Username').fill('journey-writer');
  await page.getByLabel('Password').fill('wrong');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByText('Invalid username or password.')).toBeVisible();
  await page.getByLabel('Password').fill('demo-only');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  await expect(page.getByRole('heading', { name: 'All Blogs', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'WriteSpace', exact: true }).click();
  await openNavigation(page);
  await page.getByRole('link', { name: 'Go to Dashboard' }).click();
  await expect(page).toHaveURL(/\/blogs$/);
});

test('admin sign-in, session-aware navigation and authenticated reading entry', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('admin');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Welcome, Admin.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome, Admin.' })).toBeVisible();
  await page.getByRole('link', { name: 'WriteSpace', exact: true }).click();
  await openNavigation(page);
  await expect(page.getByRole('link', { name: 'Go to Dashboard' })).toHaveAttribute('href', '/admin');
  await page.getByRole('link', { name: 'Go to Dashboard' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole('link', { name: 'WriteSpace', exact: true }).click();
  await page.getByRole('link', { name: 'Start Reading' }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  await page.getByRole('button', { name: /Account options/ }).click();
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/$/);
});

for (const route of ['/blogs', '/blog/missing', '/write', '/edit/missing', '/admin', '/users']) {
  test(`guest direct protected entry ${route} opens login`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Login', exact: true })).toBeVisible();
  });
}

test('stored preview is real text and guest click opens login', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('writespace_posts', JSON.stringify([{
      id: '12345678-1234-4123-8123-123456789abc', title: 'A stored thought',
      content: 'A real browser-local preview.', authorId: 'admin', authorName: 'Admin',
      createdAt: '2024-01-01T00:00:00.000Z',
    }]));
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'A stored thought' })).toHaveCount(2);
  await page.getByRole('region', { name: 'Latest from the Blog' }).getByRole('link', { name: /A stored thought/ }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('malformed local data remains usable for public entry', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('writespace_posts', '[{"title":{}}]');
    localStorage.setItem('writespace_users', '{}');
    localStorage.setItem('writespace_session', '{');
  });
  await page.goto('/');
  await expect(page.getByText('No posts yet — check back soon!')).toBeVisible();
  await page.getByRole('link', { name: 'Get Started Free' }).click();
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
});
