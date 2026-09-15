import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const API = 'http://localhost:3001/api/v1';

// Helpers
async function loginViaApi(email: string, password: string): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  const data = await res.json() as { accessToken: string };
  return data.accessToken;
}

test.describe('Authentication', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.getByRole('heading', { name: /Compliance Training/i })).toBeVisible();
    await expect(page.getByLabel(/E-mail/i)).toBeVisible();
    await expect(page.getByLabel(/Senha/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Entrar/i })).toBeVisible();
  });

  test('shows error with invalid credentials', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.getByLabel(/E-mail/i).fill('invalid@test.com');
    await page.getByLabel(/Senha/i).fill('WrongPassword1');
    await page.getByRole('button', { name: /Entrar/i }).click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
  });

  test('MASTER_ADMIN login redirects to /admin', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.getByLabel(/E-mail/i).fill('mateusfranco@gmail.com');
    await page.getByLabel(/Senha/i).fill('Admin@2026!');
    await page.getByRole('button', { name: /Entrar/i }).click();
    // Should redirect to /admin or /accept-terms
    await expect(page).toHaveURL(/\/(admin|accept-terms)/, { timeout: 8000 });
  });

  test('STUDENT login redirects to /student', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.getByLabel(/E-mail/i).fill('aluno1@loja-a.local');
    await page.getByLabel(/Senha/i).fill('Student@2026!');
    await page.getByRole('button', { name: /Entrar/i }).click();
    await expect(page).toHaveURL(/\/(student|accept-terms)/, { timeout: 8000 });
  });

  test('public certificate validation page is accessible', async ({ page }) => {
    await page.goto(`${BASE}/certificate/validate/CERT-INVALID-CODE`);
    await expect(page.getByRole('heading', { name: /Validação de Certificado/i })).toBeVisible();
  });

  test('middleware redirects unauthenticated user from /admin', async ({ page }) => {
    await page.goto(`${BASE}/admin`);
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('middleware redirects unauthenticated user from /student', async ({ page }) => {
    await page.goto(`${BASE}/student`);
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
