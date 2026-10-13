/** Capture browser-readable UI evidence and screenshots before final journeys. */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.PREFLIGHT_URL || 'http://127.0.0.1:4173';
const output = 'preflight-evidence';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    /** Save textual accessibility, styles, markup and an image for human review. */
    async function capture(state) {
      const prefix = `${output}/${name}-${state}`;
      const styles = await page.evaluate(() => {
        const root = document.querySelector('#root > div');
        const heading = document.querySelector('h1');
        return {
          font: getComputedStyle(root).fontFamily,
          headingFont: getComputedStyle(heading).fontFamily,
          headingSize: getComputedStyle(heading).fontSize,
          background: getComputedStyle(root).backgroundColor,
          width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
          title: document.title,
          headings: [...document.querySelectorAll('h1,h2,h3')].map(node => node.textContent),
        };
      });
      await writeFile(`${prefix}.json`, JSON.stringify({ styles, accessibility: await page.accessibility.snapshot(), errors }, null, 2));
      await writeFile(`${prefix}.html`, await page.content());
      await page.screenshot({ path: `${prefix}.png`, fullPage: true });
      if (errors.length) throw new Error(errors.join('\n'));
      console.log(name, state, JSON.stringify(styles));
    }
    await page.goto(base);
    await capture('landing-empty');
    await page.getByRole('link', { name: 'Start Reading' }).click();
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await capture('login-error');
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('admin');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.getByRole('heading', { name: 'Admin Dashboard', exact: true }).waitFor();
    await capture('admin-empty');
    await page.getByRole('link', { name: 'Write New Post', exact: true }).click();
    await page.getByLabel('Title', { exact: true }).fill('A place for a thought');
    await page.getByLabel('Content', { exact: true }).fill('A real locally saved post.\nA second line keeps its shape.');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('heading', { name: 'A place for a thought', exact: true }).waitFor();
    await capture('reader-populated');
    await page.close();
  }
} finally { await browser.close(); }
