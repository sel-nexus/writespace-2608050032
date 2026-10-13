/** Capture browser failures before the first navigation and assert them at teardown. */
import { test as base, expect } from '@playwright/test';
export const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(error.message));
    await use(page);
    expect(errors, 'Browser console and uncaught page errors').toEqual([]);
  },
});
export { expect };
