import fs from "fs";
import path from "path";
import puppeteer from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DIAGRAMS_DIR = "f:/Farm link/documentation_assets/diagrams";

const svgFiles = [
  "use_case_diagram.svg",
  "class_diagram.svg",
  "sequence_registration.svg",
  "sequence_login.svg",
  "sequence_order.svg",
  "sequence_cancel.svg",
  "sequence_admin.svg",
  "activity_visitor.svg",
  "activity_customer.svg",
  "activity_farmer_admin.svg",
  "agile_roadmap.svg"
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  for (const file of svgFiles) {
    const svgPath = path.join(DIAGRAMS_DIR, file);
    if (!fs.existsSync(svgPath)) {
      console.log(`Skipping missing ${file}`);
      continue;
    }
    const svgContent = fs.readFileSync(svgPath, "utf-8");
    const pngName = file.replace(".svg", ".png");
    const pngPath = path.join(DIAGRAMS_DIR, pngName);

    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1600, deviceScaleFactor: 2 });
    await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#ffffff;">${svgContent}</body></html>`);
    const svgElement = await page.$("svg");
    if (svgElement) {
      await svgElement.screenshot({ path: pngPath, omitBackground: false });
      console.log(`Rendered ${pngName}`);
    }
    await page.close();
  }

  await browser.close();
  console.log("All diagrams rendered to PNG successfully!");
}

run().catch(console.error);
