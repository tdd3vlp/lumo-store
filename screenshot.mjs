import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

const dir = '/private/tmp/claude-501/-Users-anton-Documents-frontend-project-12-frontend/c7c49856-11dd-432d-86ff-bf7279454282/scratchpad';

// Login page
await page.goto('http://localhost:5173/login');
await page.waitForSelector('.auth-split', { timeout: 15000 });
await page.screenshot({ path: `${dir}/login.png`, fullPage: false });

// Signup page
await page.goto('http://localhost:5173/signup');
await page.waitForSelector('.auth-split', { timeout: 10000 });
await page.screenshot({ path: `${dir}/signup.png`, fullPage: false });

// Login and go to chat
await page.goto('http://localhost:5173/login');
await page.waitForSelector('.auth-split');
await page.fill('input[name="username"]', 'admin');
await page.fill('input[name="password"]', 'admin');
await page.click('button[type="submit"]');
await page.waitForSelector('.chat-window', { timeout: 10000 }).catch(() => {});
await page.screenshot({ path: `${dir}/chat.png`, fullPage: false });

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
console.log('Console errors:', errors.join('\n') || 'none');

await browser.close();
