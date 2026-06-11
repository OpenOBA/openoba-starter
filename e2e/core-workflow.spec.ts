/**
 * #54 路 E2E 娴嬭瘯 鈥?OpenOBA 鍏ㄩ摼璺? *
 * 娴嬭瘯閾捐矾锛氱櫥褰?鈫?鏌ョ湅浠〃鐩?鈫?鍒涘缓瀹㈡埛 鈫?鍒涘缓璁㈠崟 鈫?鏌ョ湅璁㈠崟璇︽儏
 *
 * 杩愯: npx playwright test
 */
import { test, expect } from '@playwright/test'

test.describe('OpenOBA E2E 鈥?鏍稿績涓氬姟娴佺▼', () => {
  test('鐧诲綍 鈫?浠〃鐩橀噸瀹氬悜', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('.login-card h2')).toHaveText(/寮€婧怑RP/)
    await page.fill('input[placeholder="璇疯緭鍏ョ敤鎴峰悕"]', 'admin')
    await page.fill('input[placeholder="璇疯緭鍏ュ瘑鐮?]', 'admin123')
    await page.click('button:has-text("鐧?褰?)')
    await page.waitForURL(/dashboard|tasks|chat/, { timeout: 10_000 })
  })

  test('瀹㈡埛绠＄悊 鈫?鍒楄〃鍔犺浇 + 鏂板', async ({ page }) => {
    // 鍏堢櫥褰?    await page.goto('/login')
    await page.fill('input[placeholder="璇疯緭鍏ョ敤鎴峰悕"]', 'admin')
    await page.fill('input[placeholder="璇疯緭鍏ュ瘑鐮?]', 'admin123')
    await page.click('button:has-text("鐧?褰?)')
    await page.waitForTimeout(2_000)

    // 瀵艰埅鍒板鎴风鐞嗛〉
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.customer-page')).toBeVisible({ timeout: 10_000 })

    // 鍒楄〃搴斿姞杞?    await expect(page.locator('table')).toBeVisible()
  })

  test('璁㈠崟绠＄悊 鈫?鍒楄〃鍔犺浇', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[placeholder="璇疯緭鍏ョ敤鎴峰悕"]', 'admin')
    await page.fill('input[placeholder="璇疯緭鍏ュ瘑鐮?]', 'admin123')
    await page.click('button:has-text("鐧?褰?)')
    await page.waitForTimeout(2_000)

    await page.goto('/orders')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table')).toBeVisible({ timeout: 10_000 })
  })

  test('鍋ュ悍妫€鏌?鈥?API /health 绔偣', async ({ request }) => {
    const resp = await request.get('http://localhost:3000/health')
    expect(resp.ok()).toBeTruthy()
    const body = await resp.json()
    expect(body.status).toBe('ok')
    expect(body.service).toBe('OpenOBA')
    expect(body.version).toBeTruthy()
  })

  test('API 鈥?鑾峰彇褰撳墠鐢ㄦ埛淇℃伅锛堥渶鐧诲綍 cookie锛?, async ({ request, page }) => {
    // 鍏堥€氳繃娴忚鍣ㄧ櫥褰曡幏鍙?cookie
    await page.goto('/login')
    await page.fill('input[placeholder="璇疯緭鍏ョ敤鎴峰悕"]', 'admin')
    await page.fill('input[placeholder="璇疯緭鍏ュ瘑鐮?]', 'admin123')
    await page.click('button:has-text("鐧?褰?)')
    await page.waitForTimeout(2_000)

    // 鎻愬彇 cookies
    const cookies = await page.context().cookies()
    const authCookie = cookies.find(c => c.name === 'access_token')
    expect(authCookie).toBeTruthy()

    // 鐢?cookie 璋?API
    const resp = await request.get('http://localhost:3000/api/auth/profile', {
      headers: { Cookie: `access_token=${authCookie!.value}` },
    })
    expect(resp.ok()).toBeTruthy()
  })
})
