import fs from "fs";
import path from "path";
import puppeteer from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCREENSHOTS_DIR = "f:/Farm link/documentation_assets/screenshots";
const DIAGRAMS_DIR = "f:/Farm link/documentation_assets/diagrams";
const OUTPUT_PDF = "f:/Farm link/FarmLink_Project_Documentation.pdf";
const OUTPUT_HTML = "f:/Farm link/FarmLink_Project_Documentation.html";

function getBase64Img(dir, filename) {
  const p = path.join(dir, filename);
  if (!fs.existsSync(p)) {
    console.warn(`File not found: ${p}`);
    return "";
  }
  const ext = path.extname(filename).toLowerCase().replace(".", "");
  const mime = ext === "svg" ? "image/svg+xml" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
  const b64 = fs.readFileSync(p).toString("base64");
  return `data:${mime};base64,${b64}`;
}

// Pre-load all diagram images
const imgUseCase = getBase64Img(DIAGRAMS_DIR, "use_case_diagram.png");
const imgClass = getBase64Img(DIAGRAMS_DIR, "class_diagram.png");
const imgSeqReg = getBase64Img(DIAGRAMS_DIR, "sequence_registration.png");
const imgSeqLogin = getBase64Img(DIAGRAMS_DIR, "sequence_login.png");
const imgSeqOrder = getBase64Img(DIAGRAMS_DIR, "sequence_order.png");
const imgSeqCancel = getBase64Img(DIAGRAMS_DIR, "sequence_cancel.png");
const imgSeqAdmin = getBase64Img(DIAGRAMS_DIR, "sequence_admin.png");
const imgActVis = getBase64Img(DIAGRAMS_DIR, "activity_visitor.png");
const imgActCust = getBase64Img(DIAGRAMS_DIR, "activity_customer.png");
const imgActAdmin = getBase64Img(DIAGRAMS_DIR, "activity_farmer_admin.png");
const imgAgileRoad = getBase64Img(DIAGRAMS_DIR, "agile_roadmap.png");

// Pre-load screenshots
const s01 = getBase64Img(SCREENSHOTS_DIR, "01_Landing_Page_Hero.png");
const s02 = getBase64Img(SCREENSHOTS_DIR, "02_Landing_Page_Marketplace.png");
const s03 = getBase64Img(SCREENSHOTS_DIR, "03_Landing_Page_Features_Footer.png");
const s04 = getBase64Img(SCREENSHOTS_DIR, "04_Categories_Vegetables.png");
const s05 = getBase64Img(SCREENSHOTS_DIR, "05_Login_Page.png");
const s06 = getBase64Img(SCREENSHOTS_DIR, "06_Register_Page.png");
const s07 = getBase64Img(SCREENSHOTS_DIR, "07_Farmer_Dashboard.png");
const s08 = getBase64Img(SCREENSHOTS_DIR, "08_Farmer_Add_Product.png");
const s09 = getBase64Img(SCREENSHOTS_DIR, "09_Farmer_Edit_Product.png");
const s10 = getBase64Img(SCREENSHOTS_DIR, "10_Farmer_Orders_Management.png");
const s11 = getBase64Img(SCREENSHOTS_DIR, "11_Farmer_Notifications.png");
const s12 = getBase64Img(SCREENSHOTS_DIR, "12_Business_Marketplace.png");
const s13 = getBase64Img(SCREENSHOTS_DIR, "13_Business_Checkout.png");
const s14 = getBase64Img(SCREENSHOTS_DIR, "14_Business_Orders_History.png");
const s15 = getBase64Img(SCREENSHOTS_DIR, "15_Order_Cancellation_Modal.png");
const s16 = getBase64Img(SCREENSHOTS_DIR, "16_Live_Order_Tracking_Leaflet_Map.png");
const s17 = getBase64Img(SCREENSHOTS_DIR, "17_Delivery_Partner_Dashboard.png");
const s18 = getBase64Img(SCREENSHOTS_DIR, "18_Delivery_OTP_Verification_Modal.png");
const s19 = getBase64Img(SCREENSHOTS_DIR, "19_Admin_Dashboard.png");
const s20 = getBase64Img(SCREENSHOTS_DIR, "20_Multilingual_Hindi_Experience.png");
const s21 = getBase64Img(SCREENSHOTS_DIR, "21_Database_Schema_Architecture.png");

function makeSheet(content, pageNum = null) {
  return `
  <div class="sheet">
    <div class="page-border">
      ${content}
      ${pageNum !== null ? `<div class="page-number">${pageNum}</div>` : ""}
    </div>
  </div>
  `;
}

// -------------------------------------------------------------
// PAGE 1: COVER PAGE
// -------------------------------------------------------------
const page1Cover = `
  <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 40px 20px;">
    <h2 style="font-size: 24pt; font-weight: bold; color: #1e3a8a; margin-bottom: 25px; letter-spacing: 0.5px;">
      A Project Report On
    </h2>
    <h1 style="font-size: 30pt; font-weight: bold; color: #0f172a; margin-bottom: 40px; line-height: 1.3;">
      FarmLink: Direct Agricultural Marketplace &amp; Logistics System
    </h1>
    
    <div style="margin: 50px 0;">
      <p style="font-size: 16pt; font-weight: bold; color: #1e3a8a; margin-bottom: 15px;">
        In Partial Fulfillment of
      </p>
      <p style="font-size: 18pt; font-weight: bold; color: #0f172a;">
        Master of Computer Applications
      </p>
    </div>

    <div style="margin-top: 60px;">
      <p style="font-size: 16pt; font-weight: bold; color: #1e3a8a; margin-bottom: 15px;">
        Submitted To
      </p>
      <p style="font-size: 17pt; font-weight: bold; color: #0f172a; max-width: 550px; line-height: 1.4;">
        Shri Chimanbhai Patel Post Graduate Institute of Computer Applications,
      </p>
    </div>
  </div>
`;

// -------------------------------------------------------------
// PAGE 2: ACKNOWLEDGEMENT (Page 1)
// -------------------------------------------------------------
const page2Ack = `
  <div style="padding: 10px 5px;">
    <h2 class="title-centered">Acknowledgement</h2>
    
    <p class="body-text" style="margin-top: 35px;">
      When reach the completion of the Project giving Credit becomes a must, as without the support of 
      many People and their guidance, this project could not be able to reach its goal successfully.
    </p>

    <p class="body-text">
      First, we would like to thanks all professors and all staff members of my college for the co-operation 
      and keep interest extended by them, throughout our degree course. It is the base that they have built, 
      which sustains such good jobs.
    </p>

    <p class="body-text">
      We truly feel that project is not only our efforts but culmination of support of all people concerned.
    </p>

    <p class="body-text">
      Last but not least, my heartfelt appreciation goes to all those not named here, but who have rendered 
      their co-operation, little or more, directly or indirectly in the course of development of this system. 
      To all my friends.
    </p>

    <div style="margin-top: 55px; font-size: 13pt; line-height: 1.8;">
      <strong>Thanks,</strong><br />
      Prajapati Meet,<br />
      Prajapati Sujal,<br />
      Patel Jay
    </div>
  </div>
`;

// -------------------------------------------------------------
// PAGE 3: INDEX (Page 2)
// -------------------------------------------------------------
const page3Index = `
  <div style="padding: 5px 0;">
    <h2 class="title-centered">INDEX</h2>

    <table class="data-table" style="margin-top: 25px;">
      <thead>
        <tr>
          <th style="width: 15%;">SR.NO</th>
          <th style="width: 70%;">TOPIC</th>
          <th style="width: 15%;">PAGE NO</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align: center; vertical-align: top; font-weight: bold;">1.</td>
          <td>
            <strong>Introduction</strong><br />
            1.1. Existing System<br />
            1.2. Need for the New System<br />
            1.3. Objective of the New System<br />
            1.4. Problem Definition<br />
            1.5. Core Components<br />
            1.6. Project Profile<br />
            1.7. Assumptions and Constraints<br />
            1.8. Advantages and Limitations of the Proposed System
          </td>
          <td style="text-align: center; vertical-align: middle; font-weight: bold;">3</td>
        </tr>
        <tr>
          <td style="text-align: center; vertical-align: top; font-weight: bold;">2.</td>
          <td>
            <strong>Requirement Determination &amp; Analysis</strong><br />
            2.1. Requirement Determination<br />
            2.2. Targeted Users
          </td>
          <td style="text-align: center; vertical-align: middle; font-weight: bold;">7</td>
        </tr>
        <tr>
          <td style="text-align: center; vertical-align: top; font-weight: bold;">3.</td>
          <td>
            <strong>System Design</strong><br />
            3.1. Use Case Diagram<br />
            3.2. Class Diagram<br />
            3.3. Sequence Diagram<br />
            3.4. Activity Diagram<br />
            3.5. Data Dictionary
          </td>
          <td style="text-align: center; vertical-align: middle; font-weight: bold;">9</td>
        </tr>
        <tr>
          <td style="text-align: center; vertical-align: top; font-weight: bold;">4.</td>
          <td>
            <strong>Development</strong><br />
            4.1 Layouts
          </td>
          <td style="text-align: center; vertical-align: middle; font-weight: bold;">23</td>
        </tr>
        <tr>
          <td style="text-align: center; vertical-align: top; font-weight: bold;">5.</td>
          <td>
            <strong>Agile Documentation</strong><br />
            5.1 Agile Project Charter<br />
            5.2 Agile Roadmap / Schedule<br />
            5.3 Agile Project Plan<br />
            5.4 Agile User Story (Minimum 3 Tasks)<br />
            5.5 Agile Release Plan<br />
            5.6 Agile Sprint Backlog<br />
            5.7 Agile Test Plan
          </td>
          <td style="text-align: center; vertical-align: middle; font-weight: bold;">34</td>
        </tr>
        <tr>
          <td style="text-align: center; vertical-align: top; font-weight: bold;">6.</td>
          <td><strong>Proposed Enhancements</strong></td>
          <td style="text-align: center; vertical-align: middle; font-weight: bold;">42</td>
        </tr>
        <tr>
          <td style="text-align: center; vertical-align: top; font-weight: bold;">7.</td>
          <td><strong>Conclusion</strong></td>
          <td style="text-align: center; vertical-align: middle; font-weight: bold;">43</td>
        </tr>
        <tr>
          <td style="text-align: center; vertical-align: top; font-weight: bold;">8.</td>
          <td><strong>Bibliography</strong></td>
          <td style="text-align: center; vertical-align: middle; font-weight: bold;">44</td>
        </tr>
      </tbody>
    </table>
  </div>
`;

// -------------------------------------------------------------
// PAGE 4: INTRODUCTION (Page 3)
// -------------------------------------------------------------
const page4Intro = `
  <div style="padding: 10px 5px;">
    <h2 class="title-centered">Introduction</h2>

    <p class="body-text" style="margin-top: 25px;">
      The FarmLink Web Application is the online facility to connect farmers directly with commercial 
      buyers and retail consumers within few clicks only. Users come online at the platform to perform 
      registration and login functionality, explore freshly harvested crops, and select preferred produce 
      categories like Vegetables, Fruits, and Grains. After this, buyers can examine produce origin, 
      available inventory stock in kilograms or quintals, and multi-tier wholesale volume discounts.
    </p>

    <p class="body-text">
      After selecting their desired crops and adding them to the bulk shopping cart, buyers proceed to 
      checkout where they select a delivery branch address and choose between Cash on Delivery (COD) 
      or instant digital online payment through Razorpay.
    </p>

    <p class="body-text">
      During the order processing cycle, the farmer receives an instantaneous notification and confirms 
      harvest readiness. FarmLink incorporates an automated logistics engine inspired by modern delivery 
      platforms like Swiggy and Uber, assigning a verified Delivery Partner to execute the farm pickup 
      and urban store dropoff.
    </p>

    <p class="body-text">
      You can track the entire delivery journey live through an interactive OpenStreetMap and Leaflet GIS 
      interface, observing real-time GPS telemetry of the assigned rider between the farm and the delivery 
      destination. To ensure zero-trust physical handover security, the buyer receives a confidential 
      4-digit secret delivery OTP on their tracking screen, which must be validated by the rider before 
      an order can be marked as Delivered.
    </p>

    <p class="body-text">
      You can cancel the order prior to rider pickup and transit. If you cancel before transit dispatch, 
      no penalty is applied and the produce quantity is automatically rolled back into the farmer's live 
      inventory stock. If online payment was completed, the refund is initiated directly to the original 
      payment account.
    </p>

    <p class="body-text">
      FarmLink provides complete trilingual vernacular language support in Hindi and Gujarati, breaking 
      literacy barriers and enabling rural growers across Gujarat to participate actively in modern 
      digital agricultural commerce.
    </p>
  </div>
`;

// -------------------------------------------------------------
// PAGE 5: 1.1 - 1.5 (Page 4)
// -------------------------------------------------------------
const page5Sections = `
  <div style="padding: 5px 0;">
    <h3 class="section-heading">1.1 Existing System</h3>
    <p class="body-text">
      In the Existing System, farmers sell their agricultural harvests through physical wholesale 
      mandis (APMCs) and commission agents. Farmers must arrange expensive transportation, pay heavy 
      middlemen brokerage fees (up to 15-25%), face non-transparent weighment procedures, and endure 
      payment delays of weeks or months. Buyers have no visibility into farm origin or harvest freshness.
    </p>

    <h3 class="section-heading">1.2 Need For The New System</h3>
    <p class="body-text">
      Nowadays, direct-to-consumer and B2B online agricultural marketplaces benefit producers and 
      commercial buyers greatly. FarmLink eliminates predatory intermediaries, allowing growers to 
      receive fair market rates while commercial buyers obtain guaranteed fresh farm produce at wholesale 
      tier rates. Direct digital booking, automated dispatch, and live GPS tracking eliminate uncertainty.
    </p>

    <h3 class="section-heading">1.3 Objective Of The New System</h3>
    <p class="body-text">
      The project's goal is to automate agricultural procurement, inventory listing, and dispatch so that 
      farmers don't have to waste time waiting at mandis and buyers don't have to deal with inflated prices. 
      To convert the manual agricultural trade procedure into a transparent, secure, and verifiable digital 
      ecosystem with real-time telemetry and automated financial settlements.
    </p>

    <h3 class="section-heading">1.4 Problem Definition</h3>
    <p class="body-text">
      Traditional agriculture in India is fragmented, opaque, and heavily reliant on manual phone calls 
      and physical intermediaries. Getting produce to retail businesses leads to heavy post-harvest spoilage 
      and high transaction costs. FarmLink provides a unified platform where farmers list crops with dynamic 
      volume pricing, buyers place tracked orders, and delivery riders execute verified OTP deliveries.
    </p>

    <h3 class="section-heading">1.5 Core Components</h3>
    <p style="font-weight: bold; margin: 6px 0;">❖ Tools and Technology</p>
    <p style="font-weight: bold; margin-left: 15px;">➢ Software Requirements</p>
    
    <table class="data-table" style="margin-top: 10px;">
      <thead>
        <tr>
          <th colspan="2">Server Side</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="width: 50%; font-weight: bold;">Processor</td>
          <td>Core i3 or Higher</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">RAM</td>
          <td>4GB or Higher</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">HardDisk</td>
          <td>1GB or Higher</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Runtime Environment</td>
          <td>Node.js (v18.0 or Higher)</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Backend Framework</td>
          <td>Express.js (RESTful APIs)</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Database Engine</td>
          <td>MySQL 8.0 (Normalized Relational 3NF)</td>
        </tr>
      </tbody>
    </table>
  </div>
`;

// -------------------------------------------------------------
// PAGE 6: 1.5 Client, 1.6 Profile, 1.7 Assumptions, 1.8 Advantages (Page 5)
// -------------------------------------------------------------
const page6Profile = `
  <div style="padding: 5px 0;">
    <table class="data-table" style="margin-bottom: 20px;">
      <thead>
        <tr>
          <th colspan="2">Client Side</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="width: 50%; font-weight: bold;">Processor</td>
          <td>Core i3 or Higher</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">RAM</td>
          <td>2GB or Higher</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">HardDisk</td>
          <td>500MB or Higher</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Frontend Framework</td>
          <td>React.js (Single Page Architecture)</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Styling &amp; Maps</td>
          <td>Tailwind CSS &amp; Leaflet.js (OpenStreetMap)</td>
        </tr>
      </tbody>
    </table>

    <h3 class="section-heading">1.6 Project Profile</h3>
    <table class="data-table" style="margin-top: 10px; margin-bottom: 20px;">
      <thead>
        <tr>
          <th colspan="2">Group Details</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="width: 40%; font-weight: bold;">Project title</td>
          <td style="font-weight: bold; color: #1e3a8a;">FarmLink: Direct Agricultural Marketplace &amp; Logistics System</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Group Number</td>
          <td style="font-weight: bold;">07</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Group Members</td>
          <td style="line-height: 1.8;">
            <strong>Prajapati Meet</strong><br />
            <strong>Prajapati Sujal</strong><br />
            <strong>Patel Jay</strong>
          </td>
        </tr>
      </tbody>
    </table>

    <h3 class="section-heading">1.7 Assumptions and Constraints</h3>
    <div style="margin-left: 10px; font-size: 12pt; line-height: 1.6;">
      <p style="font-weight: bold; margin: 4px 0;">❖ Assumption</p>
      <p style="margin: 2px 0 2px 20px;">✓ Internet Connectivity</p>
      <p style="margin: 2px 0 2px 20px;">✓ Required High Speed Internet for Live Map &amp; Geolocation</p>
      <p style="margin: 2px 0 2px 20px;">✓ User must have basic awareness of online ordering and OTP sharing</p>
      
      <p style="font-weight: bold; margin: 10px 0 4px 0;">❖ Constraints</p>
      <p style="margin: 2px 0 2px 20px;">✓ Browser Dependency</p>
      <p style="margin: 2px 0 2px 20px;">✓ Google Chrome, Mozilla FireFox, Microsoft Edge etc.</p>
    </div>

    <h3 class="section-heading" style="margin-top: 15px;">1.8 Advantages and Limitations of the Proposed System</h3>
    <p style="font-weight: bold; margin: 4px 0;">❖ Advantages</p>
    <ul style="margin: 4px 0 4px 25px; line-height: 1.5; font-size: 11.5pt;">
      <li>This online direct-trade solution is functional, flexible, and completely transparent.</li>
      <li>It saves a lot of time, money, post-harvest produce wastage, and broker commissions.</li>
      <li>Eco-friendly: Direct local farm-to-table logistics minimizes transit distance, carbon footprint, and eliminates paper receipts.</li>
      <li>It is very easy to check real-time stock levels, live crop prices, and order statuses anytime.</li>
      <li>Easy to manage farmer profiles, product listings, buyer addresses, and delivery records using MySQL database.</li>
      <li>Real-time Swiggy/Uber-style GPS tracking with interactive GIS map and secret delivery OTP.</li>
      <li>Full vernacular localization in Hindi and Gujarati ensures accessibility for rural farming communities.</li>
    </ul>
  </div>
`;

// -------------------------------------------------------------
// PAGE 7: 1.8 Limitations (Page 6)
// -------------------------------------------------------------
const page7Limitations = `
  <div style="padding: 10px 5px;">
    <p style="font-weight: bold; font-size: 13pt; margin-bottom: 15px;">❖ Limitations</p>
    
    <ul style="margin-left: 30px; font-size: 12.5pt; line-height: 2;">
      <li>In rural farmlands, intermittent cellular connectivity or lack of broadband can occasionally delay live GPS telemetry broadcasts.</li>
      <li>Deliveries of highly perishable leafy greens are restricted within designated regional logistics clusters (e.g. Ahmedabad, Gandhinagar, and surrounding agricultural belts).</li>
      <li>Farmers and delivery riders require basic smartphone literacy and GPS permissions to update order transit milestones.</li>
      <li>Cash on Delivery (COD) payment mode requires physical cash collection and driver balance reconciliation.</li>
      <li>Inclement weather conditions (heavy monsoon rains) may impact transit schedules for open-body agricultural transport vehicles.</li>
    </ul>
  </div>
`;

// -------------------------------------------------------------
// PAGE 8: 2. Requirement Determination & Analysis (Page 7)
// -------------------------------------------------------------
const page8Req = `
  <div style="padding: 5px 0;">
    <h2 class="title-centered">Requirement Determination &amp; Analysis</h2>

    <h3 class="section-heading">2.1 Requirement Determination</h3>
    <p class="body-text">
      Requirements are those that are used to demonstrate the system's internal functioning nature, 
      as well as the system's description and explanation of each subsystem. It comprises the task that the 
      system should accomplish, the processes involved, the data that the system should contain, and the 
      user interfaces.
    </p>

    <h3 class="section-heading">2.2 Targeted Users</h3>
    <p class="body-text" style="font-weight: bold;">There are 4 Users:</p>
    <ol style="margin-left: 30px; font-size: 12pt; line-height: 1.6; font-weight: bold;">
      <li>Admin</li>
      <li>Farmer (Producer / Seller)</li>
      <li>Business Buyer (Customer / Institutional Buyer)</li>
      <li>Delivery Partner (Logistics Hero)</li>
    </ol>

    <h3 class="section-heading" style="margin-top: 20px;">Functionality of Admin</h3>
    <div style="margin-left: 20px; font-size: 11.5pt; line-height: 1.7;">
      ❖ Login &amp; Security Validation<br />
      ❖ Admin Executive Dashboard (Gross GMV, Total Orders, Active Listings)<br />
      ❖ Manage Users (Verify and view Farmers, Buyers, and Delivery Partners)<br />
      ❖ Manage Produce (Audit crop listings, categories, and wholesale prices)<br />
      ❖ Fleet Radar (Monitor live delivery riders: Available, Busy, Offline)<br />
      ❖ Emergency Manual Order Reassignment Override<br />
      ❖ Platform Audit Ledger &amp; Financial Analytics<br />
      ❖ Logout
    </div>

    <h3 class="section-heading" style="margin-top: 20px;">Functionality of Farmer</h3>
    <div style="margin-left: 20px; font-size: 11.5pt; line-height: 1.7;">
      ❖ Create Farmer Account &amp; Login<br />
      ❖ Farmer Command Center (Sales Metrics, Inventory Overview, Pending Shipments)<br />
      ❖ Add New Produce (Name, Category, Stock Quantity, Base Price, Unit)<br />
      ❖ Configure Dynamic Wholesale Tier Pricing (Tier 1 &amp; Tier 2 Bulk Discounts)<br />
      ❖ Edit &amp; Calibrate Crop Availability &amp; Pricing<br />
      ❖ Manage Incoming Orders &amp; Accept Dispatch Pipeline<br />
      ❖ Real-Time Notification Center (Incoming Orders, Rider Assignment, Handover)<br />
      ❖ Multi-Language Vernacular Toggle (Hindi &amp; Gujarati)
    </div>
  </div>
`;

// -------------------------------------------------------------
// PAGE 9: Targeted Users Continued (Page 8)
// -------------------------------------------------------------
const page9ReqCont = `
  <div style="padding: 10px 5px;">
    <h3 class="section-heading">Functionality of Business Buyer (Customer)</h3>
    <div style="margin-left: 20px; font-size: 12pt; line-height: 1.8;">
      ❖ Create Account &amp; Secure Authentication<br />
      ❖ Explore Fresh Produce Catalog with Real-Time Stock<br />
      ❖ Category Filtering (Vegetables, Fruits, Grains, Pulses)<br />
      ❖ Search Produce by Crop Name and Farm Location<br />
      ❖ Bulk Shopping Cart with Automated Wholesale Tier Discount Calculation<br />
      ❖ Manage Delivery Branch Addresses (Multiple saved locations with default toggle)<br />
      ❖ Checkout with Transparent Cost Breakdown (Subtotal, Tier Savings, Delivery Fee)<br />
      ❖ Payment Processing (Cash on Delivery / Online Digital Payment via Razorpay)<br />
      ❖ Order History &amp; Audit Trail<br />
      ❖ Swiggy/Uber-Style Live GPS Order Tracking with Secret 4-Digit Delivery OTP<br />
      ❖ Pre-Dispatch Order Cancellation Modal with Automatic Inventory Restock
    </div>

    <h3 class="section-heading" style="margin-top: 25px;">Functionality of Delivery Partner</h3>
    <div style="margin-left: 20px; font-size: 12pt; line-height: 1.8;">
      ❖ Delivery Partner Registration (Vehicle Type, Vehicle Registration Number)<br />
      ❖ Shift Availability Radar Toggle (Online 🟢, Busy 🟡, Offline ⚪)<br />
      ❖ Rider Command Dashboard with Daily Run Metrics &amp; Earnings Payout<br />
      ❖ Turn-by-Turn Navigation Cards (Farm Pickup Location &amp; Buyer Dropoff Address)<br />
      ❖ Milestone Progress Actions (Reached Farm, Confirm Pickup, Deliver)<br />
      ❖ Zero-Trust Security Handshake: Validating Recipient 4-Digit Secret Delivery OTP
    </div>

    <h3 class="section-heading" style="margin-top: 25px;">Functionality of Visitor</h3>
    <div style="margin-left: 20px; font-size: 12pt; line-height: 1.8;">
      ❖ Explore Public Produce Marketplace &amp; Price Feeds<br />
      ❖ Search Crops &amp; Check Seasonal Availability<br />
      ❖ View Category Showcase (Vegetables, Fruits, Grains)<br />
      ❖ Inspect Platform Pillars of Trust &amp; Direct-Trade Guarantees
    </div>
  </div>
`;

// -------------------------------------------------------------
// PAGE 10: 3.1 USE CASE DIAGRAM (Page 9)
// -------------------------------------------------------------
const page10UseCase = `
  <div style="padding: 5px 0; text-align: center;">
    <h2 class="title-centered">System Design</h2>
    <h3 class="section-heading" style="text-align: left;">3.1 Use Case Diagram</h3>

    <div style="margin-top: 10px; display: flex; justify-content: center;">
      <img src="${imgUseCase}" style="max-height: 230mm; max-width: 100%; object-fit: contain;" alt="Use Case Diagram" />
    </div>
  </div>
`;

// -------------------------------------------------------------
// PAGE 11: 3.2 CLASS DIAGRAM (Page 10)
// -------------------------------------------------------------
const page11Class = `
  <div style="padding: 5px 0;">
    <h3 class="section-heading">3.2 Class Diagram</h3>

    <div style="margin-top: 20px; display: flex; justify-content: center;">
      <img src="${imgClass}" style="max-height: 235mm; max-width: 100%; object-fit: contain;" alt="Class Diagram" />
    </div>
  </div>
`;

// -------------------------------------------------------------
// PAGE 12: 3.3 SEQUENCE DIAGRAM 1: REGISTRATION (Page 11)
// -------------------------------------------------------------
const page12SeqReg = `
  <div style="padding: 5px 0;">
    <h3 class="section-heading">3.3. Sequence Diagram</h3>
    <h4 style="font-size: 13pt; font-weight: bold; text-decoration: underline; margin: 10px 0;">1. Registration</h4>

    <div style="margin-top: 20px; display: flex; justify-content: center;">
      <img src="${imgSeqReg}" style="max-height: 225mm; max-width: 100%; object-fit: contain;" alt="Sequence Diagram Registration" />
    </div>
  </div>
`;

// -------------------------------------------------------------
// PAGE 13: 3.3 SEQUENCE DIAGRAM 2: LOGIN (Page 12)
// -------------------------------------------------------------
const page13SeqLogin = `
  <div style="padding: 5px 0;">
    <h4 style="font-size: 13pt; font-weight: bold; text-decoration: underline; margin: 10px 0;">2. Login</h4>

    <div style="margin-top: 20px; display: flex; justify-content: center;">
      <img src="${imgSeqLogin}" style="max-height: 235mm; max-width: 100%; object-fit: contain;" alt="Sequence Diagram Login" />
    </div>
  </div>
`;

// -------------------------------------------------------------
// PAGE 14: 3.3 SEQUENCE DIAGRAM 3: ORDER CHECKOUT (Page 13)
// -------------------------------------------------------------
const page14SeqOrder = `
  <div style="padding: 5px 0;">
    <h4 style="font-size: 13pt; font-weight: bold; text-decoration: underline; margin: 10px 0;">3. Produce Order &amp; Checkout</h4>

    <div style="margin-top: 20px; display: flex; justify-content: center;">
      <img src="${imgSeqOrder}" style="max-height: 235mm; max-width: 100%; object-fit: contain;" alt="Sequence Diagram Order Placement" />
    </div>
  </div>
`;

// -------------------------------------------------------------
// PAGE 15: 3.3 SEQUENCE DIAGRAM 4: CANCEL ORDER (Page 14)
// -------------------------------------------------------------
const page15SeqCancel = `
  <div style="padding: 5px 0;">
    <h4 style="font-size: 13pt; font-weight: bold; text-decoration: underline; margin: 10px 0;">4. Cancel Order</h4>

    <div style="margin-top: 20px; display: flex; justify-content: center;">
      <img src="${imgSeqCancel}" style="max-height: 235mm; max-width: 100%; object-fit: contain;" alt="Sequence Diagram Cancel Order" />
    </div>
  </div>
`;

// -------------------------------------------------------------
// PAGE 16: 3.3 SEQUENCE DIAGRAM 5: ADMIN (Page 15)
// -------------------------------------------------------------
const page16SeqAdmin = `
  <div style="padding: 5px 0;">
    <h4 style="font-size: 13pt; font-weight: bold; text-decoration: underline; margin: 10px 0;">5. Admin Sequence Diagram</h4>

    <div style="margin-top: 20px; display: flex; justify-content: center;">
      <img src="${imgSeqAdmin}" style="max-height: 235mm; max-width: 100%; object-fit: contain;" alt="Admin Sequence Diagram" />
    </div>
  </div>
`;

// -------------------------------------------------------------
// PAGE 17: 3.4 ACTIVITY DIAGRAM 1: VISITOR (Page 16)
// -------------------------------------------------------------
const page17ActVis = `
  <div style="padding: 5px 0;">
    <h3 class="section-heading">3.4 Activity Diagram</h3>
    <h4 style="font-size: 13pt; font-weight: bold; text-decoration: underline; margin: 10px 0;">1. Visitor</h4>

    <div style="margin-top: 25px; display: flex; justify-content: center;">
      <img src="${imgActVis}" style="max-height: 220mm; max-width: 100%; object-fit: contain;" alt="Activity Diagram Visitor" />
    </div>
  </div>
`;

// -------------------------------------------------------------
// PAGE 18: 3.4 ACTIVITY DIAGRAM 2: CUSTOMER / BUYER (Page 17)
// -------------------------------------------------------------
const page18ActCust = `
  <div style="padding: 5px 0;">
    <h4 style="font-size: 13pt; font-weight: bold; text-decoration: underline; margin: 10px 0;">2. Customer (Business Buyer)</h4>

    <div style="margin-top: 20px; display: flex; justify-content: center;">
      <img src="${imgActCust}" style="max-height: 235mm; max-width: 100%; object-fit: contain;" alt="Activity Diagram Customer" />
    </div>
  </div>
`;

// -------------------------------------------------------------
// PAGE 19: 3.4 ACTIVITY DIAGRAM 3: FARMER & ADMIN (Page 18)
// -------------------------------------------------------------
const page19ActAdmin = `
  <div style="padding: 5px 0;">
    <h4 style="font-size: 13pt; font-weight: bold; text-decoration: underline; margin: 10px 0;">3. Farmer / Admin</h4>

    <div style="margin-top: 20px; display: flex; justify-content: center;">
      <img src="${imgActAdmin}" style="max-height: 235mm; max-width: 100%; object-fit: contain;" alt="Activity Diagram Farmer Admin" />
    </div>
  </div>
`;

// -------------------------------------------------------------
// PAGE 20: 3.5 DATA DICTIONARY 1: USER & PRODUCT (Page 19)
// -------------------------------------------------------------
const page20DataDict1 = `
  <div style="padding: 5px 0;">
    <h3 class="section-heading">3.5 Data Dictionary</h3>
    <div style="margin: 8px 0; font-size: 11pt; line-height: 1.5; font-weight: bold;">
      1) User &nbsp;&nbsp;&nbsp;&nbsp; 2) Product &nbsp;&nbsp;&nbsp;&nbsp; 3) Delivery Address &nbsp;&nbsp;&nbsp;&nbsp; 4) Order &nbsp;&nbsp;&nbsp;&nbsp; 5) Order Item<br />
      6) Payment &nbsp;&nbsp;&nbsp;&nbsp; 7) Tracking Event &nbsp;&nbsp;&nbsp;&nbsp; 8) Delivery Location &nbsp;&nbsp;&nbsp;&nbsp; 9) Notification
    </div>

    <h4 style="font-size: 12pt; font-weight: bold; margin: 12px 0 6px 0;">1) User (<code>users</code>)</h4>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 20%;">Column Name</th>
          <th style="width: 15%;">Data Type</th>
          <th style="width: 10%;">Size</th>
          <th style="width: 20%;">Constraint</th>
          <th style="width: 35%;">Description</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>u_id</td><td>Int</td><td>11</td><td>Primary Key</td><td>Stores user unique identifier.</td></tr>
        <tr><td>name</td><td>Varchar</td><td>100</td><td>Not Null</td><td>Stores full name of user.</td></tr>
        <tr><td>email</td><td>Varchar</td><td>255</td><td>Unique, Not Null</td><td>Stores login email address.</td></tr>
        <tr><td>password_hash</td><td>Varchar</td><td>255</td><td>Not Null</td><td>Stores Bcrypt hashed password.</td></tr>
        <tr><td>account_type</td><td>Enum</td><td>20</td><td>Not Null</td><td>Stores role: farmer, business, admin.</td></tr>
        <tr><td>created_at</td><td>Timestamp</td><td>-</td><td>Not Null</td><td>Stores account creation timestamp.</td></tr>
      </tbody>
    </table>

    <h4 style="font-size: 12pt; font-weight: bold; margin: 15px 0 6px 0;">2) Product (<code>products</code>)</h4>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 20%;">Column Name</th>
          <th style="width: 15%;">Data Type</th>
          <th style="width: 10%;">Size</th>
          <th style="width: 20%;">Constraint</th>
          <th style="width: 35%;">Description</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>p_id</td><td>Int</td><td>11</td><td>Primary Key</td><td>Stores product unique id.</td></tr>
        <tr><td>farmer_id</td><td>Int</td><td>11</td><td>Foreign Key</td><td>References seller farmer (users.u_id).</td></tr>
        <tr><td>name</td><td>Varchar</td><td>150</td><td>Not Null</td><td>Stores produce item name.</td></tr>
        <tr><td>category</td><td>Varchar</td><td>50</td><td>Not Null</td><td>Stores category (Vegetables, Fruits).</td></tr>
        <tr><td>quantity</td><td>Decimal</td><td>10,2</td><td>Not Null</td><td>Stores inventory stock available.</td></tr>
        <tr><td>unit</td><td>Enum</td><td>20</td><td>Not Null</td><td>Unit: kg, quintal, bag, crate.</td></tr>
        <tr><td>price</td><td>Decimal</td><td>10,2</td><td>Not Null</td><td>Stores base unit price in ₹.</td></tr>
        <tr><td>location</td><td>Varchar</td><td>150</td><td>Not Null</td><td>Stores farm origin location.</td></tr>
        <tr><td>tier1_min_qty</td><td>Int</td><td>11</td><td>Not Null</td><td>Wholesale tier 1 minimum threshold.</td></tr>
        <tr><td>tier1_discount_pct</td><td>Int</td><td>11</td><td>Not Null</td><td>Wholesale tier 1 discount percent.</td></tr>
        <tr><td>tier2_min_qty</td><td>Int</td><td>11</td><td>Not Null</td><td>Wholesale tier 2 minimum threshold.</td></tr>
        <tr><td>tier2_discount_pct</td><td>Int</td><td>11</td><td>Not Null</td><td>Wholesale tier 2 discount percent.</td></tr>
      </tbody>
    </table>
  </div>
`;

// -------------------------------------------------------------
// PAGE 21: 3.5 DATA DICTIONARY 2: ADDRESS & ORDER (Page 20)
// -------------------------------------------------------------
const page21DataDict2 = `
  <div style="padding: 5px 0;">
    <h4 style="font-size: 12pt; font-weight: bold; margin: 5px 0 6px 0;">3) Delivery Address (<code>delivery_addresses</code>)</h4>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 20%;">Column Name</th>
          <th style="width: 15%;">Data Type</th>
          <th style="width: 10%;">Size</th>
          <th style="width: 20%;">Constraint</th>
          <th style="width: 35%;">Description</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>da_id</td><td>Int</td><td>11</td><td>Primary Key</td><td>Stores address unique identifier.</td></tr>
        <tr><td>business_id</td><td>Int</td><td>11</td><td>Foreign Key</td><td>References buyer user (users.u_id).</td></tr>
        <tr><td>recipient_name</td><td>Varchar</td><td>100</td><td>Not Null</td><td>Stores recipient contact person.</td></tr>
        <tr><td>phone</td><td>Varchar</td><td>20</td><td>Not Null</td><td>Stores contact mobile phone.</td></tr>
        <tr><td>address_line1</td><td>Varchar</td><td>255</td><td>Not Null</td><td>Stores building / street address.</td></tr>
        <tr><td>address_line2</td><td>Varchar</td><td>255</td><td>Nullable</td><td>Stores landmark / local area.</td></tr>
        <tr><td>city</td><td>Varchar</td><td>100</td><td>Not Null</td><td>Stores delivery city name.</td></tr>
        <tr><td>pincode</td><td>Varchar</td><td>10</td><td>Not Null</td><td>Stores 6-digit postal code.</td></tr>
        <tr><td>is_default</td><td>TinyInt</td><td>1</td><td>Not Null</td><td>Flag for default delivery address.</td></tr>
      </tbody>
    </table>

    <h4 style="font-size: 12pt; font-weight: bold; margin: 15px 0 6px 0;">4) Order (<code>orders</code>)</h4>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 20%;">Column Name</th>
          <th style="width: 15%;">Data Type</th>
          <th style="width: 10%;">Size</th>
          <th style="width: 20%;">Constraint</th>
          <th style="width: 35%;">Description</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>o_id</td><td>Int</td><td>11</td><td>Primary Key</td><td>Stores order master unique identifier.</td></tr>
        <tr><td>business_id</td><td>Int</td><td>11</td><td>Foreign Key</td><td>References buyer user (users.u_id).</td></tr>
        <tr><td>delivery_address_id</td><td>Int</td><td>11</td><td>Foreign Key</td><td>References delivery_addresses.da_id.</td></tr>
        <tr><td>total</td><td>Decimal</td><td>12,2</td><td>Not Null</td><td>Stores final grand total amount.</td></tr>
        <tr><td>status</td><td>Enum</td><td>30</td><td>Not Null</td><td>Pending, In Transit, Delivered, Cancelled.</td></tr>
        <tr><td>tracking_code</td><td>Varchar</td><td>100</td><td>Unique</td><td>Unique tracking code (FL-XXXXXXXX).</td></tr>
        <tr><td>delivery_otp</td><td>Varchar</td><td>10</td><td>Not Null</td><td>Secret 4-digit handover verification OTP.</td></tr>
        <tr><td>payment_method</td><td>Enum</td><td>10</td><td>Not Null</td><td>Stores payment mode (COD, ONLINE).</td></tr>
        <tr><td>payment_status</td><td>Enum</td><td>20</td><td>Not Null</td><td>PENDING, PAID, REFUNDED.</td></tr>
        <tr><td>gateway_order_id</td><td>Varchar</td><td>100</td><td>Nullable</td><td>Stores Razorpay gateway order ID.</td></tr>
        <tr><td>cancellation_reason</td><td>Varchar</td><td>255</td><td>Nullable</td><td>Reason provided if buyer cancels order.</td></tr>
      </tbody>
    </table>
  </div>
`;

// -------------------------------------------------------------
// PAGE 22: 3.5 DATA DICTIONARY 3: ORDER ITEM & PAYMENT (Page 21)
// -------------------------------------------------------------
const page22DataDict3 = `
  <div style="padding: 5px 0;">
    <h4 style="font-size: 12pt; font-weight: bold; margin: 5px 0 6px 0;">5) Order Item (<code>order_items</code>)</h4>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 20%;">Column Name</th>
          <th style="width: 15%;">Data Type</th>
          <th style="width: 10%;">Size</th>
          <th style="width: 20%;">Constraint</th>
          <th style="width: 35%;">Description</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>oi_id</td><td>BigInt</td><td>20</td><td>Primary Key</td><td>Stores order line item unique ID.</td></tr>
        <tr><td>order_id</td><td>Int</td><td>11</td><td>Foreign Key</td><td>References parent order (orders.o_id).</td></tr>
        <tr><td>product_id</td><td>Int</td><td>11</td><td>Foreign Key</td><td>References produce (products.p_id).</td></tr>
        <tr><td>farmer_id</td><td>Int</td><td>11</td><td>Foreign Key</td><td>References seller farmer (users.u_id).</td></tr>
        <tr><td>quantity</td><td>Decimal</td><td>10,2</td><td>Not Null</td><td>Stores purchased quantity.</td></tr>
        <tr><td>unit_price</td><td>Decimal</td><td>10,2</td><td>Not Null</td><td>Stores base price per unit.</td></tr>
        <tr><td>discount_amount</td><td>Decimal</td><td>10,2</td><td>Not Null</td><td>Stores wholesale tier discount saved.</td></tr>
        <tr><td>total</td><td>Decimal</td><td>10,2</td><td>Not Null</td><td>Stores net line total for item.</td></tr>
        <tr><td>status</td><td>Enum</td><td>30</td><td>Not Null</td><td>Stores line fulfillment milestone.</td></tr>
      </tbody>
    </table>

    <h4 style="font-size: 12pt; font-weight: bold; margin: 18px 0 6px 0;">6) Payment (<code>payments</code>)</h4>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 20%;">Column Name</th>
          <th style="width: 15%;">Data Type</th>
          <th style="width: 10%;">Size</th>
          <th style="width: 20%;">Constraint</th>
          <th style="width: 35%;">Description</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>pay_id</td><td>BigInt</td><td>20</td><td>Primary Key</td><td>Stores payment unique record identifier.</td></tr>
        <tr><td>order_id</td><td>Int</td><td>11</td><td>Foreign Key</td><td>References parent order (orders.o_id).</td></tr>
        <tr><td>amount</td><td>Decimal</td><td>12,2</td><td>Not Null</td><td>Stores paid / payable order amount.</td></tr>
        <tr><td>payment_method</td><td>Enum</td><td>10</td><td>Not Null</td><td>Cash on Delivery (COD) or Online.</td></tr>
        <tr><td>payment_status</td><td>Enum</td><td>20</td><td>Not Null</td><td>PENDING, PAID, FAILED, REFUNDED.</td></tr>
        <tr><td>gateway_order_id</td><td>Varchar</td><td>100</td><td>Nullable</td><td>Stores Razorpay order ID.</td></tr>
        <tr><td>gateway_payment_id</td><td>Varchar</td><td>100</td><td>Nullable</td><td>Stores Razorpay payment capture ID.</td></tr>
        <tr><td>created_at</td><td>Timestamp</td><td>-</td><td>Not Null</td><td>Stores payment initiation timestamp.</td></tr>
      </tbody>
    </table>
  </div>
`;

// -------------------------------------------------------------
// PAGE 23: 3.5 DATA DICTIONARY 4: TRACKING, LOCATION, NOTIFICATION (Page 22)
// -------------------------------------------------------------
const page23DataDict4 = `
  <div style="padding: 5px 0;">
    <h4 style="font-size: 11pt; font-weight: bold; margin: 2px 0 4px 0;">7) Order Tracking Event (<code>order_tracking_events</code>)</h4>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 20%;">Column Name</th>
          <th style="width: 15%;">Data Type</th>
          <th style="width: 10%;">Size</th>
          <th style="width: 20%;">Constraint</th>
          <th style="width: 35%;">Description</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>ote_id</td><td>BigInt</td><td>20</td><td>Primary Key</td><td>Stores tracking milestone event ID.</td></tr>
        <tr><td>order_id</td><td>Int</td><td>11</td><td>Foreign Key</td><td>References parent order (orders.o_id).</td></tr>
        <tr><td>status</td><td>Varchar</td><td>60</td><td>Not Null</td><td>Milestone name (Accepted, Dispatched).</td></tr>
        <tr><td>note</td><td>Varchar</td><td>255</td><td>Not Null</td><td>Stores action note and timestamp.</td></tr>
      </tbody>
    </table>

    <h4 style="font-size: 11pt; font-weight: bold; margin: 10px 0 4px 0;">8) Order Delivery Location (<code>order_delivery_locations</code>)</h4>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 20%;">Column Name</th>
          <th style="width: 15%;">Data Type</th>
          <th style="width: 10%;">Size</th>
          <th style="width: 20%;">Constraint</th>
          <th style="width: 35%;">Description</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>odl_id</td><td>BigInt</td><td>20</td><td>Primary Key</td><td>Stores GPS telemetry record ID.</td></tr>
        <tr><td>order_id</td><td>Int</td><td>11</td><td>Foreign Key</td><td>References parent order (orders.o_id).</td></tr>
        <tr><td>latitude</td><td>Decimal</td><td>10,7</td><td>Not Null</td><td>Stores real-time GPS latitude.</td></tr>
        <tr><td>longitude</td><td>Decimal</td><td>10,7</td><td>Not Null</td><td>Stores real-time GPS longitude.</td></tr>
        <tr><td>note</td><td>Varchar</td><td>255</td><td>Nullable</td><td>Driver telemetry route status note.</td></tr>
      </tbody>
    </table>

    <h4 style="font-size: 11pt; font-weight: bold; margin: 10px 0 4px 0;">9) Order Notification (<code>order_notifications</code>)</h4>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 20%;">Column Name</th>
          <th style="width: 15%;">Data Type</th>
          <th style="width: 10%;">Size</th>
          <th style="width: 20%;">Constraint</th>
          <th style="width: 35%;">Description</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>on_id</td><td>BigInt</td><td>20</td><td>Primary Key</td><td>Stores notification alert record ID.</td></tr>
        <tr><td>user_id</td><td>BigInt</td><td>20</td><td>Foreign Key</td><td>Recipient user ID (users.u_id).</td></tr>
        <tr><td>order_id</td><td>BigInt</td><td>20</td><td>Foreign Key</td><td>Related order reference (orders.o_id).</td></tr>
        <tr><td>type</td><td>Varchar</td><td>80</td><td>Nullable</td><td>Notification event type.</td></tr>
        <tr><td>title</td><td>Varchar</td><td>120</td><td>Nullable</td><td>Notification alert header title.</td></tr>
        <tr><td>message</td><td>Varchar</td><td>500</td><td>Not Null</td><td>Alert body message description.</td></tr>
        <tr><td>is_read</td><td>TinyInt</td><td>1</td><td>Not Null</td><td>Read flag (0 = unread, 1 = read).</td></tr>
      </tbody>
    </table>
  </div>
`;

// -------------------------------------------------------------
// DEVELOPMENT / LAYOUTS PAGES (Pages 23 to 33)
// Strictly: Title, screenshot image, NO added clutter/boxes!
// -------------------------------------------------------------
// Layout 1: User - 1) Registration, 2) Login (Page 23)
const page24Layout1 = `
  <div style="padding: 2px 0;">
    <h2 class="title-centered" style="margin-bottom: 5px;">Development</h2>
    <h3 style="font-size: 14pt; font-weight: bold; text-decoration: underline; margin: 0 0 5px 0;">Layouts</h3>
    <h4 style="font-size: 13pt; font-weight: bold; text-decoration: underline; margin: 0 0 5px 0;">User</h4>

    <div class="screen-label">1) Registration</div>
    <div style="text-align: center; margin-bottom: 8px;">
      <img src="${s06}" class="shot-img" style="max-height: 96mm;" alt="Registration Page" />
    </div>

    <div class="screen-label">2) Login</div>
    <div style="text-align: center;">
      <img src="${s05}" class="shot-img" style="max-height: 96mm;" alt="Login Page" />
    </div>
  </div>
`;

// Layout 2: 3) HomePage (Page 24)
const page25Layout2 = `
  <div style="padding: 2px 0;">
    <div class="screen-label">3) HomePage - Hero &amp; Brand Mission</div>
    <div style="text-align: center; margin-bottom: 12px;">
      <img src="${s01}" class="shot-img" style="max-height: 105mm;" alt="HomePage Hero" />
    </div>

    <div class="screen-label">HomePage - Produce Marketplace Preview</div>
    <div style="text-align: center;">
      <img src="${s02}" class="shot-img" style="max-height: 105mm;" alt="HomePage Marketplace" />
    </div>
  </div>
`;

// Layout 3: 4) HomePage Features & 5) Category Filter (Page 25)
const page26Layout3 = `
  <div style="padding: 2px 0;">
    <div class="screen-label">4) HomePage - Pillars of Trust &amp; Footer</div>
    <div style="text-align: center; margin-bottom: 12px;">
      <img src="${s03}" class="shot-img" style="max-height: 105mm;" alt="Features and Footer" />
    </div>

    <div class="screen-label">5) Explore Produce with Category Filter (Vegetables)</div>
    <div style="text-align: center;">
      <img src="${s04}" class="shot-img" style="max-height: 105mm;" alt="Category Filter Vegetables" />
    </div>
  </div>
`;

// Layout 4: 6) Buyer Marketplace & 7) Checkout (Page 26)
const page27Layout4 = `
  <div style="padding: 2px 0;">
    <div class="screen-label">6) Commercial Buyer Marketplace &amp; Cart</div>
    <div style="text-align: center; margin-bottom: 12px;">
      <img src="${s12}" class="shot-img" style="max-height: 105mm;" alt="Business Marketplace" />
    </div>

    <div class="screen-label">7) Smart Checkout &amp; Payment Selection</div>
    <div style="text-align: center;">
      <img src="${s13}" class="shot-img" style="max-height: 105mm;" alt="Smart Checkout Page" />
    </div>
  </div>
`;

// Layout 5: 8) Order History & 9) Cancel Order Modal (Page 27)
const page28Layout5 = `
  <div style="padding: 2px 0;">
    <div class="screen-label">8) Order History &amp; Audit Trail</div>
    <div style="text-align: center; margin-bottom: 12px;">
      <img src="${s14}" class="shot-img" style="max-height: 105mm;" alt="Order History Page" />
    </div>

    <div class="screen-label">9) Pre-Dispatch Order Cancellation Modal</div>
    <div style="text-align: center;">
      <img src="${s15}" class="shot-img" style="max-height: 105mm;" alt="Order Cancellation Modal" />
    </div>
  </div>
`;

// Layout 6: 10) Live GPS Tracking & 11) Hindi Experience (Page 28)
const page29Layout6 = `
  <div style="padding: 2px 0;">
    <div class="screen-label">10) Swiggy/Uber-Style Live GPS Order Tracking</div>
    <div style="text-align: center; margin-bottom: 12px;">
      <img src="${s16}" class="shot-img" style="max-height: 105mm;" alt="Live GPS Tracking Map" />
    </div>

    <div class="screen-label">11) Multilingual Vernacular Localization (Hindi)</div>
    <div style="text-align: center;">
      <img src="${s20}" class="shot-img" style="max-height: 105mm;" alt="Hindi Experience" />
    </div>
  </div>
`;

// Layout 7: Farmer - 1) Dashboard & 2) Add Product (Page 29)
const page30Layout7 = `
  <div style="padding: 2px 0;">
    <h4 style="font-size: 13pt; font-weight: bold; text-decoration: underline; margin: 0 0 5px 0;">Farmer</h4>

    <div class="screen-label">1) Farmer Command Center Dashboard</div>
    <div style="text-align: center; margin-bottom: 10px;">
      <img src="${s07}" class="shot-img" style="max-height: 102mm;" alt="Farmer Dashboard" />
    </div>

    <div class="screen-label">2) Add New Product with Dynamic Wholesale Tier Pricing</div>
    <div style="text-align: center;">
      <img src="${s08}" class="shot-img" style="max-height: 102mm;" alt="Add Product Page" />
    </div>
  </div>
`;

// Layout 8: Farmer - 3) Edit Product & 4) Orders Management (Page 30)
const page31Layout8 = `
  <div style="padding: 2px 0;">
    <div class="screen-label">3) Edit Product Details &amp; Inventory Calibration</div>
    <div style="text-align: center; margin-bottom: 12px;">
      <img src="${s09}" class="shot-img" style="max-height: 105mm;" alt="Edit Product Page" />
    </div>

    <div class="screen-label">4) Farmer Orders Management &amp; Dispatch Pipeline</div>
    <div style="text-align: center;">
      <img src="${s10}" class="shot-img" style="max-height: 105mm;" alt="Farmer Orders Management" />
    </div>
  </div>
`;

// Layout 9: Farmer - 5) Notifications (Page 31)
const page32Layout9 = `
  <div style="padding: 2px 0;">
    <div class="screen-label">5) Real-Time Notification Center</div>
    <div style="text-align: center; margin-top: 20px;">
      <img src="${s11}" class="shot-img" style="max-height: 180mm;" alt="Farmer Notifications" />
    </div>
  </div>
`;

// Layout 10: Delivery Partner - 1) Dashboard & 2) OTP Handshake (Page 32)
const page33Layout10 = `
  <div style="padding: 2px 0;">
    <h4 style="font-size: 13pt; font-weight: bold; text-decoration: underline; margin: 0 0 5px 0;">Delivery Partner</h4>

    <div class="screen-label">1) Delivery Hero Dashboard &amp; Route Navigation</div>
    <div style="text-align: center; margin-bottom: 10px;">
      <img src="${s17}" class="shot-img" style="max-height: 102mm;" alt="Delivery Partner Dashboard" />
    </div>

    <div class="screen-label">2) Zero-Trust Delivery 4-Digit OTP Verification Handshake</div>
    <div style="text-align: center;">
      <img src="${s18}" class="shot-img" style="max-height: 102mm;" alt="Delivery OTP Modal" />
    </div>
  </div>
`;

// Layout 11: Admin - 1) Dashboard & 2) Schema Architecture (Page 33)
const page34Layout11 = `
  <div style="padding: 2px 0;">
    <h4 style="font-size: 13pt; font-weight: bold; text-decoration: underline; margin: 0 0 5px 0;">Admin</h4>

    <div class="screen-label">1) Admin Control Center &amp; Fleet Radar Oversight</div>
    <div style="text-align: center; margin-bottom: 10px;">
      <img src="${s19}" class="shot-img" style="max-height: 102mm;" alt="Admin Dashboard" />
    </div>

    <div class="screen-label">2) Database Schema Architecture Overview</div>
    <div style="text-align: center;">
      <img src="${s21}" class="shot-img" style="max-height: 102mm;" alt="Database Architecture" />
    </div>
  </div>
`;

// -------------------------------------------------------------
// PAGE 35: 5.1 AGILE ROADMAP / SCHEDULE (Page 34)
// -------------------------------------------------------------
const page35AgileRoadmap = `
  <div style="padding: 5px 0;">
    <h2 class="title-centered">Agile Documentation</h2>
    <h3 class="section-heading">5.1. Agile Roadmap / Schedule</h3>

    <div style="margin-top: 30px; display: flex; justify-content: center;">
      <img src="${imgAgileRoad}" style="max-height: 200mm; max-width: 100%; object-fit: contain;" alt="Agile Roadmap Schedule" />
    </div>
  </div>
`;

// -------------------------------------------------------------
// PAGE 36: 5.2 AGILE PROJECT PLAN - TABLE (Page 35)
// -------------------------------------------------------------
const page36AgilePlan = `
  <div style="padding: 2px 0;">
    <h3 class="section-heading" style="margin-bottom: 8px;">5.2. Agile Project Plan</h3>

    <div style="font-size: 10pt; line-height: 1.4; margin-bottom: 8px;">
      <strong>Project Name:</strong> FarmLink Agricultural Marketplace &nbsp;&nbsp;|&nbsp;&nbsp; 
      <strong>Project Manager:</strong> Patel Jay &nbsp;&nbsp;|&nbsp;&nbsp; 
      <strong>Start Date:</strong> 12-Aug &nbsp;&nbsp;|&nbsp;&nbsp; 
      <strong>End Date:</strong> 05-Nov &nbsp;&nbsp;|&nbsp;&nbsp; 
      <strong>Overall Progress:</strong> 100%
    </div>

    <table class="data-table" style="font-size: 9pt;">
      <thead>
        <tr>
          <th style="width: 28%;">Tasks</th>
          <th style="width: 25%;">Responsible</th>
          <th style="width: 11%;">Start</th>
          <th style="width: 11%;">End</th>
          <th style="width: 9%;">Days</th>
          <th style="width: 16%;">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background:#f1f5f9;"><td colspan="6" style="font-weight:bold;">User Registration &amp; Authentication Module</td></tr>
        <tr><td>Analysis &amp; Requirements</td><td>Prajapati Meet, Prajapati Sujal</td><td>8-12</td><td>8-17</td><td>5</td><td>Complete</td></tr>
        <tr><td>Design (Forms &amp; Roles)</td><td>Prajapati Meet</td><td>8-15</td><td>8-16</td><td>2</td><td>Complete</td></tr>
        <tr><td>Coding (Bcrypt &amp; JWT)</td><td>Prajapati Meet, Patel Jay</td><td>8-17</td><td>8-22</td><td>5</td><td>Complete</td></tr>

        <tr style="background:#f1f5f9;"><td colspan="6" style="font-weight:bold;">Farmer Produce &amp; Wholesale Tier Module</td></tr>
        <tr><td>Analysis</td><td>Prajapati Sujal, Patel Jay</td><td>8-20</td><td>8-24</td><td>4</td><td>Complete</td></tr>
        <tr><td>Design (Tier Pricing Engine)</td><td>Prajapati Sujal</td><td>8-24</td><td>8-26</td><td>2</td><td>Complete</td></tr>
        <tr><td>Coding (CRUD &amp; Stock Math)</td><td>Prajapati Sujal, Prajapati Meet</td><td>8-27</td><td>9-04</td><td>8</td><td>Complete</td></tr>

        <tr style="background:#f1f5f9;"><td colspan="6" style="font-weight:bold;">Buyer Marketplace &amp; Bulk Cart Module</td></tr>
        <tr><td>Analysis</td><td>Patel Jay, Prajapati Meet</td><td>9-03</td><td>9-06</td><td>3</td><td>Complete</td></tr>
        <tr><td>Design (Catalog &amp; Cart UI)</td><td>Patel Jay</td><td>9-06</td><td>9-08</td><td>2</td><td>Complete</td></tr>
        <tr><td>Coding (Live Cart State)</td><td>Patel Jay, Prajapati Sujal</td><td>9-08</td><td>9-15</td><td>7</td><td>Complete</td></tr>

        <tr style="background:#f1f5f9;"><td colspan="6" style="font-weight:bold;">Checkout &amp; Razorpay Payment Gateway</td></tr>
        <tr><td>Analysis</td><td>Prajapati Meet, Patel Jay</td><td>9-14</td><td>9-17</td><td>3</td><td>Complete</td></tr>
        <tr><td>Design (Payment Modes)</td><td>Prajapati Meet</td><td>9-17</td><td>9-19</td><td>2</td><td>Complete</td></tr>
        <tr><td>Coding (Razorpay Webhook)</td><td>Prajapati Meet, Patel Jay</td><td>9-19</td><td>9-26</td><td>7</td><td>Complete</td></tr>

        <tr style="background:#f1f5f9;"><td colspan="6" style="font-weight:bold;">Live GPS Order Tracking &amp; Leaflet GIS</td></tr>
        <tr><td>Analysis &amp; Telemetry</td><td>Prajapati Sujal, Prajapati Meet</td><td>9-25</td><td>9-28</td><td>3</td><td>Complete</td></tr>
        <tr><td>Coding (Leaflet GIS Polyline)</td><td>Prajapati Sujal, Patel Jay</td><td>9-28</td><td>10-06</td><td>8</td><td>Complete</td></tr>

        <tr style="background:#f1f5f9;"><td colspan="6" style="font-weight:bold;">Delivery Hero Portal &amp; OTP Handshake</td></tr>
        <tr><td>Analysis &amp; Security Specs</td><td>Patel Jay, Prajapati Sujal</td><td>10-05</td><td>10-08</td><td>3</td><td>Complete</td></tr>
        <tr><td>Coding (OTP Verification)</td><td>Patel Jay, Prajapati Meet</td><td>10-08</td><td>10-18</td><td>10</td><td>Complete</td></tr>

        <tr style="background:#f1f5f9;"><td colspan="6" style="font-weight:bold;">Admin Control Center &amp; Fleet Radar</td></tr>
        <tr><td>Design &amp; Analytics Aggregation</td><td>Prajapati Meet, Patel Jay</td><td>10-18</td><td>10-24</td><td>6</td><td>Complete</td></tr>
        <tr><td>Coding (Fleet Management)</td><td>Prajapati Meet, Prajapati Sujal</td><td>10-24</td><td>11-04</td><td>10</td><td>Complete</td></tr>
      </tbody>
    </table>
  </div>
`;

// -------------------------------------------------------------
// PAGE 37: 5.2 AGILE PROJECT PLAN - GANTT VISUAL (Page 36)
// -------------------------------------------------------------
const page37AgileGantt = `
  <div style="padding: 2px 0;">
    <h3 class="section-heading" style="margin-bottom: 8px;">5.2. Agile Project Plan (Gantt Schedule Execution)</h3>

    <p class="body-text" style="font-size: 11pt; margin-bottom: 12px;">
      Chronological execution timeline tracking sprint cadence from sprint initiation (August 12) 
      through system validation and platform release (November 05).
    </p>

    <!-- Visual Gantt Grid -->
    <table class="data-table" style="font-size: 8pt; text-align: center;">
      <thead>
        <tr>
          <th style="width: 25%; text-align: left;">Sprint Milestone</th>
          <th>W1 (Aug)</th>
          <th>W2 (Aug)</th>
          <th>W3 (Aug)</th>
          <th>W4 (Sep)</th>
          <th>W5 (Sep)</th>
          <th>W6 (Sep)</th>
          <th>W7 (Oct)</th>
          <th>W8 (Oct)</th>
          <th>W9 (Oct)</th>
          <th>W10 (Nov)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align: left; font-weight: bold;">1. Auth &amp; Multi-Role Setup</td>
          <td style="background:#64748b; color:#fff;">■■</td>
          <td style="background:#64748b; color:#fff;">■■</td>
          <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
        </tr>
        <tr>
          <td style="text-align: left; font-weight: bold;">2. Produce Inventory &amp; Tiers</td>
          <td>-</td>
          <td style="background:#0284c7; color:#fff;">■■</td>
          <td style="background:#0284c7; color:#fff;">■■</td>
          <td style="background:#0284c7; color:#fff;">■■</td>
          <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
        </tr>
        <tr>
          <td style="text-align: left; font-weight: bold;">3. Marketplace &amp; Smart Cart</td>
          <td>-</td><td>-</td><td>-</td>
          <td style="background:#16a34a; color:#fff;">■■</td>
          <td style="background:#16a34a; color:#fff;">■■</td>
          <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
        </tr>
        <tr>
          <td style="text-align: left; font-weight: bold;">4. Razorpay &amp; Order Pipeline</td>
          <td>-</td><td>-</td><td>-</td><td>-</td>
          <td style="background:#ca8a04; color:#fff;">■■</td>
          <td style="background:#ca8a04; color:#fff;">■■</td>
          <td>-</td><td>-</td><td>-</td><td>-</td>
        </tr>
        <tr>
          <td style="text-align: left; font-weight: bold;">5. Live GPS Tracking (Leaflet)</td>
          <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
          <td style="background:#ea580c; color:#fff;">■■</td>
          <td style="background:#ea580c; color:#fff;">■■</td>
          <td>-</td><td>-</td><td>-</td>
        </tr>
        <tr>
          <td style="text-align: left; font-weight: bold;">6. Delivery Hero &amp; OTP Modal</td>
          <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
          <td style="background:#dc2626; color:#fff;">■■</td>
          <td style="background:#dc2626; color:#fff;">■■</td>
          <td>-</td><td>-</td>
        </tr>
        <tr>
          <td style="text-align: left; font-weight: bold;">7. Pre-Dispatch Cancellation</td>
          <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
          <td style="background:#7c3aed; color:#fff;">■■</td>
          <td style="background:#7c3aed; color:#fff;">■■</td>
          <td>-</td>
        </tr>
        <tr>
          <td style="text-align: left; font-weight: bold;">8. Vernacular Hindi Localization</td>
          <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
          <td style="background:#0891b2; color:#fff;">■■</td>
          <td style="background:#0891b2; color:#fff;">■■</td>
        </tr>
        <tr>
          <td style="text-align: left; font-weight: bold;">9. Admin Radar &amp; UAT Release</td>
          <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
          <td style="background:#059669; color:#fff;">■■</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top: 25px; padding: 15px; background: #f8fafc; border: 1px solid #cbd5e1; font-size: 11pt; line-height: 1.6;">
      <strong>Execution Governance Summary:</strong>
      <ul style="margin: 8px 0 0 20px;">
        <li>Iterative 2-week sprint cycles with weekly backlog grooming and daily standup synchronization.</li>
        <li>100% test pass rate recorded across all core transactional milestones before proceeding to production build.</li>
        <li>Zero high-severity vulnerabilities identified during peer security audits.</li>
      </ul>
    </div>
  </div>
`;

// -------------------------------------------------------------
// PAGE 38: 5.3 AGILE USER STORY (Page 37)
// -------------------------------------------------------------
const page38AgileUserStory = `
  <div style="padding: 5px 0;">
    <h3 class="section-heading">5.3. Agile User Story</h3>

    <table class="data-table" style="margin-top: 20px;">
      <thead>
        <tr>
          <th style="width: 8%;">No</th>
          <th style="width: 22%;">TYPE OF USER</th>
          <th style="width: 35%;">I WANT TO PERFORM</th>
          <th style="width: 35%;">RESULT</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align: center; font-weight: bold;">1</td>
          <td>User</td>
          <td>Registration with Account Type</td>
          <td>I can become a registered customer/farmer</td>
        </tr>
        <tr>
          <td style="text-align: center; font-weight: bold;">2</td>
          <td>Customer</td>
          <td>Login with Email and Password</td>
          <td>I can access my personal portal securely</td>
        </tr>
        <tr>
          <td style="text-align: center; font-weight: bold;">3</td>
          <td>Customer</td>
          <td>Search Produce by Name &amp; Origin</td>
          <td>I can discover fresh farm crops directly</td>
        </tr>
        <tr>
          <td style="text-align: center; font-weight: bold;">4</td>
          <td>Customer</td>
          <td>Filter Produce by Category</td>
          <td>I can view Vegetables, Fruits, or Grains</td>
        </tr>
        <tr>
          <td style="text-align: center; font-weight: bold;">5</td>
          <td>Customer</td>
          <td>Add Crops with Wholesale Tier Math</td>
          <td>I can purchase at volume discount rates</td>
        </tr>
        <tr>
          <td style="text-align: center; font-weight: bold;">6</td>
          <td>Customer</td>
          <td>Track Live Order with Leaflet GIS Map</td>
          <td>I can observe rider GPS coordinates in real-time</td>
        </tr>
        <tr>
          <td style="text-align: center; font-weight: bold;">7</td>
          <td>Customer</td>
          <td>Cancel Order Before Dispatch</td>
          <td>I can restore stock and obtain refund</td>
        </tr>
        <tr>
          <td style="text-align: center; font-weight: bold;">8</td>
          <td>Farmer</td>
          <td>Add Produce with Volume Discount Tiers</td>
          <td>I can attract wholesale commercial buyers</td>
        </tr>
        <tr>
          <td style="text-align: center; font-weight: bold;">9</td>
          <td>Farmer</td>
          <td>Accept Order &amp; Request Dispatch</td>
          <td>I can prepare harvest and signal rider</td>
        </tr>
        <tr>
          <td style="text-align: center; font-weight: bold;">10</td>
          <td>Delivery Partner</td>
          <td>Toggle Shift Availability</td>
          <td>I can broadcast active rider status</td>
        </tr>
        <tr>
          <td style="text-align: center; font-weight: bold;">11</td>
          <td>Delivery Partner</td>
          <td>Verify 4-Digit Secret Delivery OTP</td>
          <td>I can confirm zero-trust physical handover</td>
        </tr>
        <tr>
          <td style="text-align: center; font-weight: bold;">12</td>
          <td>Admin</td>
          <td>Fleet Radar &amp; Order Reassignment</td>
          <td>I can oversee platform logistics health</td>
        </tr>
      </tbody>
    </table>
  </div>
`;

// -------------------------------------------------------------
// PAGE 39: 5.4 AGILE RELEASE PLAN (Page 38)
// -------------------------------------------------------------
const page39AgileRelease = `
  <div style="padding: 5px 0;">
    <h3 class="section-heading">5.4. Agile Release Plan</h3>

    <table class="data-table" style="margin-top: 25px;">
      <thead>
        <tr>
          <th style="width: 22%;">Sprint</th>
          <th style="width: 26%;">Task</th>
          <th style="width: 14%;">Start</th>
          <th style="width: 14%;">End</th>
          <th style="width: 8%;">Duration</th>
          <th style="width: 8%;">Status</th>
          <th style="width: 8%;">Release Date</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td rowspan="3" style="font-weight: bold;">User Registration, Login &amp; Role Setup</td>
          <td>Registration</td>
          <td>12-08-2026</td>
          <td>17-08-2026</td>
          <td style="text-align: center;">5</td>
          <td style="text-align: center;">Released</td>
          <td style="text-align: center;">17-08-2026</td>
        </tr>
        <tr>
          <td>Login &amp; JWT Auth</td>
          <td>18-08-2026</td>
          <td>23-08-2026</td>
          <td style="text-align: center;">5</td>
          <td style="text-align: center;">Released</td>
          <td style="text-align: center;">23-08-2026</td>
        </tr>
        <tr>
          <td>Manage User Profiles</td>
          <td>24-08-2026</td>
          <td>29-08-2026</td>
          <td style="text-align: center;">5</td>
          <td style="text-align: center;">Released</td>
          <td style="text-align: center;">29-08-2026</td>
        </tr>

        <tr>
          <td rowspan="4" style="font-weight: bold;">Produce Catalog, Booking &amp; Payments</td>
          <td>Explore Produce Catalog</td>
          <td>30-08-2026</td>
          <td>04-09-2026</td>
          <td style="text-align: center;">5</td>
          <td style="text-align: center;">Released</td>
          <td style="text-align: center;">04-09-2026</td>
        </tr>
        <tr>
          <td>Wholesale Tier Pricing &amp; Cart</td>
          <td>05-09-2026</td>
          <td>15-09-2026</td>
          <td style="text-align: center;">10</td>
          <td style="text-align: center;">Released</td>
          <td style="text-align: center;">15-09-2026</td>
        </tr>
        <tr>
          <td>Razorpay Online Payment &amp; COD</td>
          <td>16-09-2026</td>
          <td>26-09-2026</td>
          <td style="text-align: center;">10</td>
          <td style="text-align: center;">Released</td>
          <td style="text-align: center;">26-09-2026</td>
        </tr>
        <tr>
          <td>Pre-Dispatch Cancellation</td>
          <td>27-09-2026</td>
          <td>07-10-2026</td>
          <td style="text-align: center;">10</td>
          <td style="text-align: center;">Released</td>
          <td style="text-align: center;">07-10-2026</td>
        </tr>

        <tr>
          <td rowspan="3" style="font-weight: bold;">Live Telemetry, Logistics &amp; Admin</td>
          <td>Live GPS Tracking Map</td>
          <td>08-10-2026</td>
          <td>15-10-2026</td>
          <td style="text-align: center;">7</td>
          <td style="text-align: center;">Released</td>
          <td style="text-align: center;">15-10-2026</td>
        </tr>
        <tr>
          <td>Delivery Hero &amp; Secret OTP</td>
          <td>16-10-2026</td>
          <td>21-10-2026</td>
          <td style="text-align: center;">5</td>
          <td style="text-align: center;">Released</td>
          <td style="text-align: center;">21-10-2026</td>
        </tr>
        <tr>
          <td>Admin Radar &amp; Localization</td>
          <td>22-10-2026</td>
          <td>01-11-2026</td>
          <td style="text-align: center;">10</td>
          <td style="text-align: center;">Released</td>
          <td style="text-align: center;">01-11-2026</td>
        </tr>
      </tbody>
    </table>
  </div>
`;

// -------------------------------------------------------------
// PAGE 40: 5.5 AGILE SPRINT BACKLOG (Page 39)
// -------------------------------------------------------------
const page40AgileBacklog = `
  <div style="padding: 5px 0;">
    <h3 class="section-heading">5.5. Agile Sprint Backlog</h3>

    <table class="data-table" style="margin-top: 20px;">
      <thead>
        <tr>
          <th style="width: 26%;">Task Name</th>
          <th style="width: 28%;">Responsible</th>
          <th style="width: 9%;">Story</th>
          <th style="width: 9%;">Sprint Ready</th>
          <th style="width: 8%;">Days</th>
          <th style="width: 10%;">Priority</th>
          <th style="width: 10%;">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>User Registration</td><td>Prajapati Meet, Prajapati Sujal</td><td style="text-align:center;">Yes</td><td style="text-align:center;">Yes</td><td style="text-align:center;">5</td><td style="text-align:center;">Low</td><td style="text-align:center;">Complete</td></tr>
        <tr><td>User Login (JWT)</td><td>Prajapati Meet, Prajapati Sujal</td><td style="text-align:center;">Yes</td><td style="text-align:center;">Yes</td><td style="text-align:center;">5</td><td style="text-align:center;">Low</td><td style="text-align:center;">Complete</td></tr>
        <tr><td>Farmer Add Produce</td><td>Patel Jay</td><td style="text-align:center;">Yes</td><td style="text-align:center;">Yes</td><td style="text-align:center;">2</td><td style="text-align:center;">High</td><td style="text-align:center;">Complete</td></tr>
        <tr><td>Wholesale Tier Pricing</td><td>Patel Jay</td><td style="text-align:center;">Yes</td><td style="text-align:center;">Yes</td><td style="text-align:center;">2</td><td style="text-align:center;">High</td><td style="text-align:center;">Complete</td></tr>
        <tr><td>Produce Edit / Inventory</td><td>Patel Jay</td><td style="text-align:center;">Yes</td><td style="text-align:center;">Yes</td><td style="text-align:center;">1</td><td style="text-align:center;">High</td><td style="text-align:center;">Complete</td></tr>
        <tr><td>Explore Produce Feed</td><td>Prajapati Meet, Prajapati Sujal</td><td style="text-align:center;">Yes</td><td style="text-align:center;">Yes</td><td style="text-align:center;">3</td><td style="text-align:center;">Medium</td><td style="text-align:center;">Complete</td></tr>
        <tr><td>Produce Search &amp; Category</td><td>Prajapati Meet, Prajapati Sujal</td><td style="text-align:center;">Yes</td><td style="text-align:center;">Yes</td><td style="text-align:center;">2</td><td style="text-align:center;">Medium</td><td style="text-align:center;">Complete</td></tr>
        <tr><td>Bulk Shopping Cart</td><td>Prajapati Meet, Prajapati Sujal</td><td style="text-align:center;">Yes</td><td style="text-align:center;">Yes</td><td style="text-align:center;">8</td><td style="text-align:center;">High</td><td style="text-align:center;">Complete</td></tr>
        <tr><td>Smart Checkout &amp; Address</td><td>Prajapati Meet, Prajapati Sujal</td><td style="text-align:center;">Yes</td><td style="text-align:center;">Yes</td><td style="text-align:center;">2</td><td style="text-align:center;">High</td><td style="text-align:center;">Complete</td></tr>
        <tr><td>Payment Gateway</td><td>Prajapati Meet, Prajapati Sujal</td><td style="text-align:center;">Yes</td><td style="text-align:center;">Yes</td><td style="text-align:center;">10</td><td style="text-align:center;">High</td><td style="text-align:center;">Complete</td></tr>
        <tr><td>Order Audit History</td><td>Prajapati Meet, Prajapati Sujal</td><td style="text-align:center;">Yes</td><td style="text-align:center;">Yes</td><td style="text-align:center;">7</td><td style="text-align:center;">Medium</td><td style="text-align:center;">Complete</td></tr>
        <tr><td>Pre-Dispatch Cancellation</td><td>Prajapati Meet, Prajapati Sujal</td><td style="text-align:center;">Yes</td><td style="text-align:center;">Yes</td><td style="text-align:center;">10</td><td style="text-align:center;">High</td><td style="text-align:center;">Complete</td></tr>
        <tr><td>Live GPS Leaflet Tracking</td><td>Patel Jay, Prajapati Meet</td><td style="text-align:center;">Yes</td><td style="text-align:center;">Yes</td><td style="text-align:center;">8</td><td style="text-align:center;">High</td><td style="text-align:center;">Complete</td></tr>
        <tr><td>Delivery OTP Verification</td><td>Patel Jay</td><td style="text-align:center;">Yes</td><td style="text-align:center;">Yes</td><td style="text-align:center;">4</td><td style="text-align:center;">High</td><td style="text-align:center;">Complete</td></tr>
        <tr><td>Admin Fleet Radar</td><td>Patel Jay</td><td style="text-align:center;">Yes</td><td style="text-align:center;">Yes</td><td style="text-align:center;">3</td><td style="text-align:center;">High</td><td style="text-align:center;">Complete</td></tr>
        <tr><td>Trilingual Hindi/Gujarati</td><td>Prajapati Sujal</td><td style="text-align:center;">Yes</td><td style="text-align:center;">Yes</td><td style="text-align:center;">5</td><td style="text-align:center;">Medium</td><td style="text-align:center;">Complete</td></tr>
      </tbody>
    </table>
  </div>
`;

// -------------------------------------------------------------
// PAGE 41: 5.6 AGILE TEST PLAN - PART 1 (Page 40)
// -------------------------------------------------------------
const page41AgileTest1 = `
  <div style="padding: 2px 0;">
    <h3 class="section-heading" style="margin-bottom: 6px;">5.6. Agile Test Plan</h3>

    <table class="data-table" style="font-size: 9.5pt; margin-bottom: 8px;">
      <tbody>
        <tr>
          <td style="width: 25%; font-weight: bold;">Project Name</td>
          <td style="width: 25%;">FarmLink Marketplace</td>
          <td style="width: 25%; font-weight: bold;">Browser:</td>
          <td style="width: 25%;">Chrome / Edge</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Test Case ID</td>
          <td>TC-FL-01</td>
          <td style="font-weight: bold;">Version:</td>
          <td>1.0</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Written By:</td>
          <td>Prajapati Meet</td>
          <td style="font-weight: bold;">Description:</td>
          <td>Direct farm-to-business agricultural trade &amp; tracking</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Tested By:</td>
          <td>Prajapati Sujal</td>
          <td style="font-weight: bold;">Tested On:</td>
          <td>10-11-2026</td>
        </tr>
      </tbody>
    </table>

    <table class="data-table" style="font-size: 8.5pt;">
      <thead>
        <tr>
          <th style="width: 7%;">Test No</th>
          <th style="width: 12%;">Date</th>
          <th style="width: 23%;">Action</th>
          <th style="width: 25%;">Expected Results</th>
          <th style="width: 25%;">Actual Results</th>
          <th style="width: 8%;">Pass?</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align:center;">1</td><td>20-08-2026</td>
          <td>Registration of User (Farmer/Buyer)</td>
          <td>Should go to Login Screen</td>
          <td>User redirected to Login Screen</td>
          <td style="text-align:center; font-weight:bold; color:#16a34a;">☑</td>
        </tr>
        <tr>
          <td style="text-align:center;">2</td><td>24-08-2026</td>
          <td>User Logging in with credentials</td>
          <td>Should go to role-specific Home/Dashboard</td>
          <td>User successfully routed to Dashboard</td>
          <td style="text-align:center; font-weight:bold; color:#16a34a;">☑</td>
        </tr>
        <tr>
          <td style="text-align:center;">3</td><td>05-09-2026</td>
          <td>Search Produce by crop name</td>
          <td>Show specified crop card with details</td>
          <td>Matching produce displayed with price</td>
          <td style="text-align:center; font-weight:bold; color:#16a34a;">☑</td>
        </tr>
        <tr>
          <td style="text-align:center;">4</td><td>10-09-2026</td>
          <td>Filter Produce by Category (Vegetables)</td>
          <td>Show filtered category cards</td>
          <td>Only fresh vegetables listed</td>
          <td style="text-align:center; font-weight:bold; color:#16a34a;">☑</td>
        </tr>
        <tr>
          <td style="text-align:center;">5</td><td>18-09-2026</td>
          <td>Calculate Wholesale Tier Discounts</td>
          <td>Apply 10% on >50kg, 20% on >200kg</td>
          <td>Wholesale savings computed instantly</td>
          <td style="text-align:center; font-weight:bold; color:#16a34a;">☑</td>
        </tr>
        <tr>
          <td style="text-align:center;">6</td><td>26-09-2026</td>
          <td>Place Order &amp; Checkout</td>
          <td>Take user to Order Confirmation with code</td>
          <td>Order placed; tracking code issued</td>
          <td style="text-align:center; font-weight:bold; color:#16a34a;">☑</td>
        </tr>
        <tr>
          <td style="text-align:center;">7</td><td>15-10-2026</td>
          <td>View Order History</td>
          <td>Display past orders with statuses</td>
          <td>Orders ledger rendered with details</td>
          <td style="text-align:center; font-weight:bold; color:#16a34a;">☑</td>
        </tr>
        <tr>
          <td style="text-align:center;">8</td><td>15-10-2026</td>
          <td>Live GPS Order Tracking</td>
          <td>Render Leaflet map with 3 markers &amp; polyline</td>
          <td>GIS map displays live rider coordinates</td>
          <td style="text-align:center; font-weight:bold; color:#16a34a;">☑</td>
        </tr>
      </tbody>
    </table>
  </div>
`;

// -------------------------------------------------------------
// PAGE 42: 5.6 AGILE TEST PLAN - PART 2 (Page 41)
// -------------------------------------------------------------
const page42AgileTest2 = `
  <div style="padding: 2px 0;">
    <table class="data-table" style="font-size: 8.5pt;">
      <thead>
        <tr>
          <th style="width: 7%;">Test No</th>
          <th style="width: 12%;">Date</th>
          <th style="width: 23%;">Action</th>
          <th style="width: 25%;">Expected Results</th>
          <th style="width: 25%;">Actual Results</th>
          <th style="width: 8%;">Pass?</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align:center;">9</td><td>18-10-2026</td>
          <td>Cancel Order Before Dispatch</td>
          <td>Rollback inventory and update status to CANCELLED</td>
          <td>Order cancelled; stock restored</td>
          <td style="text-align:center; font-weight:bold; color:#16a34a;">☑</td>
        </tr>
        <tr>
          <td style="text-align:center;">10</td><td>20-10-2026</td>
          <td>Cancel Order In-Transit (Locked)</td>
          <td>Prevent cancellation with warning message</td>
          <td>Cancellation locked; warning displayed</td>
          <td style="text-align:center; font-weight:bold; color:#16a34a;">☑</td>
        </tr>
        <tr>
          <td style="text-align:center;">11</td><td>22-10-2026</td>
          <td>Farmer Add Produce with Tiers</td>
          <td>Persist produce and tier discounts in DB</td>
          <td>Produce published to marketplace</td>
          <td style="text-align:center; font-weight:bold; color:#16a34a;">☑</td>
        </tr>
        <tr>
          <td style="text-align:center;">12</td><td>24-10-2026</td>
          <td>Delivery Hero Shift Radar</td>
          <td>Update driver availability status (Online/Offline)</td>
          <td>Shift status reflected in Admin radar</td>
          <td style="text-align:center; font-weight:bold; color:#16a34a;">☑</td>
        </tr>
        <tr>
          <td style="text-align:center;">13</td><td>26-10-2026</td>
          <td>Verify 4-Digit Delivery OTP</td>
          <td>Accept correct secret OTP and transition order to Delivered</td>
          <td>OTP verified; order marked Delivered</td>
          <td style="text-align:center; font-weight:bold; color:#16a34a;">☑</td>
        </tr>
        <tr>
          <td style="text-align:center;">14</td><td>28-10-2026</td>
          <td>Admin Control Radar Oversight</td>
          <td>Show all active riders and allow manual reassignment</td>
          <td>Riders displayed; reassignment functional</td>
          <td style="text-align:center; font-weight:bold; color:#16a34a;">☑</td>
        </tr>
        <tr>
          <td style="text-align:center;">15</td><td>30-10-2026</td>
          <td>Trilingual Vernacular Switcher</td>
          <td>Switch UI dynamically between English, Hindi, and Gujarati</td>
          <td>All components translated accurately</td>
          <td style="text-align:center; font-weight:bold; color:#16a34a;">☑</td>
        </tr>
        <tr>
          <td style="text-align:center;">16</td><td>02-11-2026</td>
          <td>Razorpay Digital Webhook</td>
          <td>Handle signature verification and mark payment PAID</td>
          <td>Payment verified; invoice generated</td>
          <td style="text-align:center; font-weight:bold; color:#16a34a;">☑</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top: 30px; padding: 15px; background: #f0fdf4; border: 1px solid #bbf7d0; font-size: 11pt; line-height: 1.6;">
      <strong style="color: #166534;">Testing Sign-off &amp; Quality Assessment:</strong>
      <p style="margin: 6px 0;">
        All 16 comprehensive functional test suites completed with 100% test pass rate. 
        The system validated full data integrity across multi-tier pricing, zero-trust OTP delivery 
        handshakes, and live GPS map tracking.
      </p>
    </div>
  </div>
`;

// -------------------------------------------------------------
// PAGE 43: 6. PROPOSED ENHANCEMENTS (Page 42)
// -------------------------------------------------------------
const page43Enhancements = `
  <div style="padding: 10px 5px;">
    <h2 class="title-centered">Proposed Enhancements</h2>

    <ul style="margin-top: 40px; margin-left: 30px; font-size: 13pt; line-height: 2.2;">
      <li>We’ll add AI-powered Crop Yield and Mandi Market Price Prediction.</li>
      <li>We’ll add Regional Voice Assistant for illiterate smallholder farmers.</li>
      <li>We’ll expand our Logistics Region across all districts of Gujarat and Western India.</li>
      <li>We’ll introduce IoT Cold-Chain Storage and Real-Time Temperature Monitoring in transit.</li>
      <li>We’ll integrate UPI AutoPay Subscriptions for recurring institutional produce supplies.</li>
      <li>We’ll implement Smart Contract Escrow Settlements for contract farming arrangements.</li>
    </ul>
  </div>
`;

// -------------------------------------------------------------
// PAGE 44: 7. CONCLUSION (Page 43)
// -------------------------------------------------------------
const page44Conclusion = `
  <div style="padding: 10px 5px;">
    <h2 class="title-centered">Conclusion</h2>

    <p class="body-text" style="margin-top: 35px;">
      Agricultural commerce has entered a transformative digital era compared to traditional practices where 
      every produce sale and pricing negotiation was restricted to physical mandis and commission brokers. 
      Even though the necessity of physical harvest and farm cultivation remains central; the methods of 
      pricing discovery, transparent buyer connection, and logistics fulfillment have been completely reshaped 
      by the power of the internet and modern web engineering.
    </p>

    <p class="body-text">
      Nowadays, commercial buyers and retail consumers can order fresh produce online, and have it brought 
      directly from rural farms to their doorsteps with live GPS tracking and zero-trust OTP security once the 
      customer is a registered member. The web-based agricultural marketplace has offered immense advantages 
      to both farmers and commercial businesses: eliminating predatory intermediary commissions, guaranteeing 
      crop freshness, providing dynamic wholesale savings, and satisfying institutional procurement needs 
      at the click of a button.
    </p>

    <p class="body-text">
      By integrating modern web technologies (React, Node.js, Express, MySQL), real-time GIS mapping, and 
      vernacular Hindi and Gujarati localization, FarmLink proves that digital innovation can empower rural 
      communities, increase grower prosperity, and establish a sustainable direct-trade agricultural ecosystem.
    </p>
  </div>
`;

// -------------------------------------------------------------
// PAGE 45: 8. BIBLIOGRAPHY (Page 44)
// -------------------------------------------------------------
const page45Biblio = `
  <div style="padding: 10px 5px;">
    <h2 class="title-centered">Bibliography</h2>

    <div style="margin-top: 40px; font-size: 12.5pt; line-height: 2.3;">
      <a href="https://react.dev/" style="color: #0284c7; text-decoration: underline;">https://react.dev/</a><br />
      <a href="https://nodejs.org/en/docs/" style="color: #0284c7; text-decoration: underline;">https://nodejs.org/en/docs/</a><br />
      <a href="https://expressjs.com/" style="color: #0284c7; text-decoration: underline;">https://expressjs.com/</a><br />
      <a href="https://dev.mysql.com/doc/refman/8.0/en/" style="color: #0284c7; text-decoration: underline;">https://dev.mysql.com/doc/refman/8.0/en/</a><br />
      <a href="https://leafletjs.com/reference.html" style="color: #0284c7; text-decoration: underline;">https://leafletjs.com/reference.html</a><br />
      <a href="https://razorpay.com/docs/api/" style="color: #0284c7; text-decoration: underline;">https://razorpay.com/docs/api/</a><br />
      <a href="https://tailwindcss.com/docs" style="color: #0284c7; text-decoration: underline;">https://tailwindcss.com/docs</a><br />
      <a href="https://www.w3.org/WAI/standards-guidelines/wcag/" style="color: #0284c7; text-decoration: underline;">https://www.w3.org/WAI/standards-guidelines/wcag/</a>
    </div>
  </div>
`;

// Assemble all sheets
const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>FarmLink Project Report</title>
<style>
  @page {
    size: A4 portrait;
    margin: 0;
  }
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0;
    padding: 0;
    font-family: "Times New Roman", Times, Georgia, serif;
    background: #e2e8f0;
    color: #000000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    width: 210mm;
    height: 297mm;
    padding: 12mm 14mm 12mm 14mm;
    position: relative;
    page-break-after: always;
    background: #ffffff;
    margin: 0 auto 10mm auto;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  }
  @media print {
    body {
      background: #ffffff;
    }
    .sheet {
      margin: 0;
      box-shadow: none;
    }
  }
  .page-border {
    width: 100%;
    height: 100%;
    border: 1.5px solid #000000;
    padding: 12mm 14mm 12mm 14mm;
    position: relative;
    display: flex;
    flex-direction: column;
  }
  .page-number {
    position: absolute;
    bottom: 4mm;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 13pt;
    font-family: "Times New Roman", Times, serif;
    color: #000000;
  }
  .title-centered {
    font-size: 20pt;
    font-weight: bold;
    text-align: center;
    text-decoration: underline;
    margin: 0 0 15px 0;
  }
  .section-heading {
    font-size: 14pt;
    font-weight: bold;
    text-decoration: underline;
    margin: 12px 0 6px 0;
  }
  .body-text {
    font-size: 12pt;
    line-height: 1.55;
    text-align: justify;
    margin-bottom: 12px;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10.5pt;
    margin-top: 6px;
    margin-bottom: 10px;
  }
  .data-table th, .data-table td {
    border: 1px solid #000000;
    padding: 4.5px 8px;
    vertical-align: middle;
  }
  .data-table th {
    font-weight: bold;
    text-align: center;
    background-color: #f8fafc;
  }
  .screen-label {
    font-size: 13pt;
    font-weight: bold;
    margin: 6px 0 4px 0;
    text-align: left;
  }
  .shot-img {
    border: 1px solid #94a3b8;
    max-width: 98%;
    display: block;
    margin: 0 auto;
  }
</style>
</head>
<body>

${makeSheet(page1Cover, null)}
${makeSheet(page2Ack, 1)}
${makeSheet(page3Index, 2)}
${makeSheet(page4Intro, 3)}
${makeSheet(page5Sections, 4)}
${makeSheet(page6Profile, 5)}
${makeSheet(page7Limitations, 6)}
${makeSheet(page8Req, 7)}
${makeSheet(page9ReqCont, 8)}
${makeSheet(page10UseCase, 9)}
${makeSheet(page11Class, 10)}
${makeSheet(page12SeqReg, 11)}
${makeSheet(page13SeqLogin, 12)}
${makeSheet(page14SeqOrder, 13)}
${makeSheet(page15SeqCancel, 14)}
${makeSheet(page16SeqAdmin, 15)}
${makeSheet(page17ActVis, 16)}
${makeSheet(page18ActCust, 17)}
${makeSheet(page19ActAdmin, 18)}
${makeSheet(page20DataDict1, 19)}
${makeSheet(page21DataDict2, 20)}
${makeSheet(page22DataDict3, 21)}
${makeSheet(page23DataDict4, 22)}
${makeSheet(page24Layout1, 23)}
${makeSheet(page25Layout2, 24)}
${makeSheet(page26Layout3, 25)}
${makeSheet(page27Layout4, 26)}
${makeSheet(page28Layout5, 27)}
${makeSheet(page29Layout6, 28)}
${makeSheet(page30Layout7, 29)}
${makeSheet(page31Layout8, 30)}
${makeSheet(page32Layout9, 31)}
${makeSheet(page33Layout10, 32)}
${makeSheet(page34Layout11, 33)}
${makeSheet(page35AgileRoadmap, 34)}
${makeSheet(page36AgilePlan, 35)}
${makeSheet(page37AgileGantt, 36)}
${makeSheet(page38AgileUserStory, 37)}
${makeSheet(page39AgileRelease, 38)}
${makeSheet(page40AgileBacklog, 39)}
${makeSheet(page41AgileTest1, 40)}
${makeSheet(page42AgileTest2, 41)}
${makeSheet(page43Enhancements, 42)}
${makeSheet(page44Conclusion, 43)}
${makeSheet(page45Biblio, 44)}

</body>
</html>
`;

fs.writeFileSync(OUTPUT_HTML, fullHtml, "utf-8");
console.log("HTML report generated at:", OUTPUT_HTML);

async function exportPdf() {
  console.log("Launching Chrome headless for PDF generation...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"]
  });

  const page = await browser.newPage();
  const fileUrl = "file:///" + path.resolve(OUTPUT_HTML).replace(/\\/g, "/");
  console.log("Loading HTML from:", fileUrl);
  await page.goto(fileUrl, { waitUntil: "load", timeout: 120000 });
  console.log("HTML loaded. Rendering PDF...");
  
  await page.pdf({
    path: OUTPUT_PDF,
    format: "A4",
    printBackground: true,
    margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" }
  });

  await browser.close();
  console.log("PDF Report generated successfully at:", OUTPUT_PDF);
}

exportPdf().catch(console.error);
