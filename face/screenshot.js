const { chromium } = require('playwright');

(async () => {
    console.log('Launching browser...');
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    console.log('Navigating to localhost:5173...');
    await page.goto('http://localhost:5173/');
    console.log('Waiting for elements to load...');
    await page.waitForTimeout(3000); // give recharts time to animate
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'local_screenshot.png' });
    await browser.close();
    console.log('Done!');
})();
