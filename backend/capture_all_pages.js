import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:5000/api';
const OUTPUT_DIR = 'f:\\Farm link\\documentation_assets\\screenshots';

async function loginApi(email, password) {
  const res = await fetch(API_URL + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Login failed: ' + data.message);
  return data;
}

async function run() {
  console.log('=== Starting FarmLink Automated Screenshot Capture ===');
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Authenticating test accounts...');
  const farmerAuth = await loginApi('ramesh.patel@farmlink.com', 'Password123!');
  const buyerAuth = await loginApi('pooja.mehta@farmlink.com', 'Password123!');
  const riderAuth = await loginApi('vikram.rider@farmlink.com', 'Password123!');
  const adminAuth = await loginApi('admin1@gmail.com', 'Password123!');
  console.log('All accounts authenticated successfully.');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1440,900',
      '--disable-web-security',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  async function snap(filename, delayMs = 1200) {
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    const filepath = path.join(OUTPUT_DIR, filename);
    await page.screenshot({ path: filepath });
    console.log('Saved: ' + filename);
  }

  console.log('Capturing Public Pages...');
  await page.goto(BASE_URL + '/', { waitUntil: 'networkidle0' });
  await snap('01_Landing_Page_Hero.png', 1200);

  await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
  await snap('02_Landing_Page_Marketplace.png', 800);

  await page.evaluate(() => window.scrollTo({ top: 1400, behavior: 'instant' }));
  await snap('03_Landing_Page_Features_Footer.png', 800);

  await page.goto(BASE_URL + '/categories/Vegetables', { waitUntil: 'networkidle0' });
  await snap('04_Categories_Vegetables.png', 1200);

  await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle0' });
  await snap('05_Login_Page.png', 800);

  await page.goto(BASE_URL + '/register', { waitUntil: 'networkidle0' });
  await snap('06_Register_Page.png', 800);

  async function setSession(auth, extraLocalStorage = {}) {
    await page.evaluate((authObj, extras) => {
      localStorage.clear();
      localStorage.setItem('farmlinkToken', authObj.token);
      localStorage.setItem('farmlinkCurrentUser', JSON.stringify(authObj.user));
      for (const [k, v] of Object.entries(extras)) {
        localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
      }
    }, auth, extraLocalStorage);
  }

  console.log('Capturing Farmer Portal...');
  await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle0' });
  await setSession(farmerAuth);
  await page.goto(BASE_URL + '/farmer-dashboard', { waitUntil: 'networkidle0' });
  await snap('07_Farmer_Dashboard.png', 1500);

  await page.goto(BASE_URL + '/add-product', { waitUntil: 'networkidle0' });
  await snap('08_Farmer_Add_Product.png', 1000);

  await page.goto(BASE_URL + '/edit-product/1', { waitUntil: 'networkidle0' });
  await snap('09_Farmer_Edit_Product.png', 1200);

  await page.goto(BASE_URL + '/farmer-orders', { waitUntil: 'networkidle0' });
  await snap('10_Farmer_Orders_Management.png', 1500);

  await page.goto(BASE_URL + '/farmer-notifications', { waitUntil: 'networkidle0' });
  await snap('11_Farmer_Notifications.png', 1200);

  console.log('Capturing Business Buyer Portal...');
  const cartMock = [
    {
      product: {
        id: 1,
        name: 'Fresh Hybrid Tomatoes',
        category: 'Vegetables',
        price: '35.00',
        unit: 'kg',
        quantity: 480,
        location: 'Anand, Gujarat',
        farmer_name: 'Ramesh Patel',
      },
      quantity: 50,
    },
    {
      product: {
        id: 3,
        name: 'Carot (Fresh Orange)',
        category: 'Vegetables',
        price: '23.00',
        unit: 'kg',
        quantity: 300,
        location: 'Nashik, Maharashtra',
        farmer_name: 'Sanket Jadav',
      },
      quantity: 30,
    },
  ];

  await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle0' });
  await setSession(buyerAuth, { farmlinkCart: cartMock });
  await page.goto(BASE_URL + '/business-dashboard', { waitUntil: 'networkidle0' });
  await snap('12_Business_Marketplace.png', 1500);

  await page.goto(BASE_URL + '/checkout', { waitUntil: 'networkidle0' });
  await snap('13_Business_Checkout.png', 1500);

  await page.goto(BASE_URL + '/buyer-orders', { waitUntil: 'networkidle0' });
  await snap('14_Business_Orders_History.png', 1500);

  try {
    const cancelBtn = await page.evaluate(() => {
      const btn = document.querySelector(".btn-cancel-order");
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (cancelBtn) {
      await snap('15_Order_Cancellation_Modal.png', 1000);
      await page.evaluate(() => {
        const closeBtn = document.querySelector(".modal-close-btn, .btn-secondary");
        if (closeBtn) closeBtn.click();
      });
    } else {
      await snap('15_Order_Cancellation_Modal.png', 500);
    }
  } catch (e) {
    console.log('Cancellation modal note:', e.message);
  }

  console.log('Capturing Live Order Tracking (Swiggy style)...');
  await page.goto(BASE_URL + '/orders/65/tracking', { waitUntil: 'networkidle0' });
  await snap('16_Live_Order_Tracking_Leaflet_Map.png', 3000);

  console.log('Capturing Delivery Partner Portal...');
  await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle0' });
  await setSession(riderAuth);
  await page.goto(BASE_URL + '/delivery-dashboard', { waitUntil: 'networkidle0' });
  await snap('17_Delivery_Partner_Dashboard.png', 2000);

  try {
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('OTP') || b.textContent.includes('Deliver'));
      if (btn) btn.click();
    });
    await snap('18_Delivery_OTP_Verification_Modal.png', 1200);
  } catch (e) {
    console.log('OTP modal note:', e.message);
  }

  console.log('Capturing Admin Portal...');
  await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle0' });
  await setSession(adminAuth);
  await page.goto(BASE_URL + '/admin-dashboard', { waitUntil: 'networkidle0' });
  await snap('19_Admin_Dashboard.png', 2000);

  console.log('Capturing Multilingual Experience...');
  await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle0' });
  await setSession(farmerAuth, { farmlinkLanguage: 'hindi' });
  await page.goto(BASE_URL + '/farmer-dashboard', { waitUntil: 'networkidle0' });
  await snap('20_Multilingual_Hindi_Experience.png', 2000);

  await browser.close();
  console.log('=== All Screenshots Captured Successfully! ===');
}

run().catch((err) => {
  console.error('Screenshot capture error:', err);
  process.exit(1);
});
