import { createContext, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";

const LanguageContext = createContext(null);
const originalTextNodes = new WeakMap();
const originalPlaceholders = new WeakMap();

const translations = {
  english: {},
  hindi: {
    "Language": "भाषा", "English": "अंग्रेज़ी", "Hindi": "हिन्दी", "Gujarati": "गुजराती",
    "Home": "होम", "How It Works": "यह कैसे काम करता है", "Categories": "श्रेणियां", "Login": "लॉग इन", "Register": "रजिस्टर",
    "Fresh Produce. Fair Prices. Direct Connections.": "ताज़ी उपज। उचित दाम। सीधे संपर्क।",
    "DIRECT FARMER-TO-BUSINESS MARKETPLACE": "किसान से व्यवसाय तक सीधा बाज़ार",
    "I am a Farmer": "मैं किसान हूँ", "I am a Business": "मैं व्यवसाय हूँ", "Fresh from Farms": "सीधे खेतों से",
    "Farmers": "किसान", "Businesses": "व्यवसाय", "Product Listings": "उत्पाद लिस्टिंग", "Crop Categories": "फसल श्रेणियां",
    "SIMPLE PROCESS": "सरल प्रक्रिया", "How FarmLink Works": "FarmLink कैसे काम करता है", "Farmers List Stock": "किसान स्टॉक जोड़ते हैं",
    "Businesses Search": "व्यवसाय खोजते हैं", "Order & Delivery": "ऑर्डर और डिलीवरी", "CROP CATEGORIES": "फसल श्रेणियां",
    "Find What You Need": "अपनी ज़रूरत खोजें", "Vegetables": "सब्ज़ियां", "Fruits": "फल", "Grains": "अनाज", "Pulses": "दालें",
    "Welcome Back": "वापसी पर स्वागत है", "Email Address": "ईमेल पता", "Password": "पासवर्ड", "Create an account": "खाता बनाएं", "Back to FarmLink": "FarmLink पर वापस",
    "Access denied": "पहुंच अस्वीकृत", "Go to Login": "लॉग इन करें", "Logout": "लॉग आउट", "Dashboard": "डैशबोर्ड",
    "FARMER DASHBOARD": "किसान डैशबोर्ड", "BUSINESS DASHBOARD": "व्यवसाय डैशबोर्ड", "My Products": "मेरे उत्पाद",
    "My Orders": "मेरे ऑर्डर", "Orders": "ऑर्डर", "Add Product": "उत्पाद जोड़ें", "Add New": "नया जोड़ें",
    "Active Products": "सक्रिय उत्पाद", "Pending Orders": "लंबित ऑर्डर", "Completed Orders": "पूर्ण ऑर्डर", "Total Sales": "कुल बिक्री",
    "My Product Listings": "मेरी उत्पाद लिस्टिंग", "No products added yet": "अभी कोई उत्पाद नहीं जोड़ा गया", "Edit": "संपादित करें", "Delete": "हटाएं",
    "Marketplace": "बाज़ार", "Available Products": "उपलब्ध उत्पाद", "No products found": "कोई उत्पाद नहीं मिला",
    "Order Quantity": "ऑर्डर मात्रा", "Buy Now": "अभी खरीदें", "Checkout": "चेकआउट", "Product Details": "उत्पाद विवरण",
    "Delivery Address": "डिलीवरी पता", "Payment Method": "भुगतान विधि", "Place Order": "ऑर्डर करें",
    "Back to Home": "होम पर जाएं", "Back to all categories": "सभी श्रेणियों पर जाएं", "CROP CATEGORY": "फसल श्रेणी",
    "Loading products...": "उत्पाद लोड हो रहे हैं...", "No products": "कोई उत्पाद नहीं", "Farmer:": "किसान:", "Available:": "उपलब्ध:",
    "Accept": "स्वीकार करें", "Cancel": "रद्द करें", "Start Delivery": "डिलीवरी शुरू करें", "Mark Delivered": "डिलीवर किया गया", "View Tracking": "ट्रैकिंग देखें",
    "Order timeline": "ऑर्डर समयरेखा", "Payment": "भुगतान", "Refresh": "रीफ़्रेश", "Search crop, category, or location...": "फसल, श्रेणी या स्थान खोजें...",
    "Enter your email": "अपना ईमेल दर्ज करें", "Enter your password": "अपना पासवर्ड दर्ज करें", "Product Name": "उत्पाद का नाम", "Category": "श्रेणी", "Location": "स्थान"
  },
  gujarati: {
    "Language": "ભાષા", "English": "અંગ્રેજી", "Hindi": "હિન્દી", "Gujarati": "ગુજરાતી",
    "Home": "હોમ", "How It Works": "તે કેવી રીતે કામ કરે છે", "Categories": "શ્રેણીઓ", "Login": "લૉગ ઇન", "Register": "નોંધણી",
    "Fresh Produce. Fair Prices. Direct Connections.": "તાજી ઉપજ. વાજબી ભાવ. સીધા જોડાણો.",
    "DIRECT FARMER-TO-BUSINESS MARKETPLACE": "ખેડૂતથી વ્યવસાય સુધીનું સીધું બજાર",
    "I am a Farmer": "હું ખેડૂત છું", "I am a Business": "હું વ્યવસાય છું", "Fresh from Farms": "ખેતરમાંથી તાજું",
    "Farmers": "ખેડૂતો", "Businesses": "વ્યવસાયો", "Product Listings": "ઉત્પાદન યાદીઓ", "Crop Categories": "પાકની શ્રેણીઓ",
    "SIMPLE PROCESS": "સરળ પ્રક્રિયા", "How FarmLink Works": "FarmLink કેવી રીતે કામ કરે છે", "Farmers List Stock": "ખેડૂતો સ્ટોક ઉમેરે છે",
    "Businesses Search": "વ્યવસાયો શોધે છે", "Order & Delivery": "ઓર્ડર અને ડિલિવરી", "CROP CATEGORIES": "પાકની શ્રેણીઓ",
    "Find What You Need": "તમારી જરૂરિયાત શોધો", "Vegetables": "શાકભાજી", "Fruits": "ફળો", "Grains": "અનાજ", "Pulses": "કઠોળ",
    "Welcome Back": "પાછા આવકાર", "Email Address": "ઈમેલ સરનામું", "Password": "પાસવર્ડ", "Create an account": "ખાતું બનાવો", "Back to FarmLink": "FarmLink પર પાછા જાઓ",
    "Access denied": "પ્રવેશ નકારવામાં આવ્યો", "Go to Login": "લૉગ ઇન પર જાઓ", "Logout": "લૉગ આઉટ", "Dashboard": "ડેશબોર્ડ",
    "FARMER DASHBOARD": "ખેડૂત ડેશબોર્ડ", "BUSINESS DASHBOARD": "વ્યવસાય ડેશબોર્ડ", "My Products": "મારા ઉત્પાદનો",
    "My Orders": "મારા ઓર્ડર", "Orders": "ઓર્ડર", "Add Product": "ઉત્પાદન ઉમેરો", "Add New": "નવું ઉમેરો",
    "Active Products": "સક્રિય ઉત્પાદનો", "Pending Orders": "બાકી ઓર્ડર", "Completed Orders": "પૂર્ણ ઓર્ડર", "Total Sales": "કુલ વેચાણ",
    "My Product Listings": "મારી ઉત્પાદન યાદીઓ", "No products added yet": "હજુ કોઈ ઉત્પાદન ઉમેરાયું નથી", "Edit": "ફેરફાર કરો", "Delete": "કાઢી નાખો",
    "Marketplace": "બજાર", "Available Products": "ઉપલબ્ધ ઉત્પાદનો", "No products found": "કોઈ ઉત્પાદન મળ્યું નથી",
    "Order Quantity": "ઓર્ડર જથ્થો", "Buy Now": "હમણાં ખરીદો", "Checkout": "ચેકઆઉટ", "Product Details": "ઉત્પાદન વિગતો",
    "Delivery Address": "ડિલિવરી સરનામું", "Payment Method": "ચુકવણી પદ્ધતિ", "Place Order": "ઓર્ડર કરો",
    "Back to Home": "હોમ પર જાઓ", "Back to all categories": "બધી શ્રેણીઓ પર જાઓ", "CROP CATEGORY": "પાક શ્રેણી",
    "Loading products...": "ઉત્પાદનો લોડ થઈ રહ્યા છે...", "No products": "કોઈ ઉત્પાદન નથી", "Farmer:": "ખેડૂત:", "Available:": "ઉપલબ્ધ:",
    "Accept": "સ્વીકારો", "Cancel": "રદ કરો", "Start Delivery": "ડિલિવરી શરૂ કરો", "Mark Delivered": "પહોંચાડેલ તરીકે ચિહ્નિત કરો", "View Tracking": "ટ્રેકિંગ જુઓ",
    "Order timeline": "ઓર્ડર સમયરેખા", "Payment": "ચુકવણી", "Refresh": "તાજું કરો", "Search crop, category, or location...": "પાક, શ્રેણી અથવા સ્થાન શોધો...",
    "Enter your email": "તમારો ઈમેલ દાખલ કરો", "Enter your password": "તમારો પાસવર્ડ દાખલ કરો", "Product Name": "ઉત્પાદન નામ", "Category": "શ્રેણી", "Location": "સ્થાન"
  }
};

function translateText(text, language) {
  const leading = text.match(/^\s*/)?.[0] || "";
  const trailing = text.match(/\s*$/)?.[0] || "";
  const original = text.trim();
  return translations[language][original] ? `${leading}${translations[language][original]}${trailing}` : text;
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem("farmlinkLanguage") || "english");
  useEffect(() => localStorage.setItem("farmlinkLanguage", language), [language]);
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() { return useContext(LanguageContext); }

export function PageTranslator() {
  const { language } = useLanguage();

  useEffect(() => {
    const applyTranslation = () => {
      document.documentElement.lang = language === "gujarati" ? "gu" : language === "hindi" ? "hi" : "en";
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        if (!node.parentElement?.closest("script, style, option")) {
          if (!originalTextNodes.has(node)) originalTextNodes.set(node, node.textContent);
          const sourceText = originalTextNodes.get(node);
          const translated = language === "english" ? sourceText : translateText(sourceText, language);
          if (translated !== node.textContent) node.textContent = translated;
        }
      });
      document.querySelectorAll("input[placeholder], textarea[placeholder]").forEach((element) => {
        if (!originalPlaceholders.has(element)) originalPlaceholders.set(element, element.placeholder);
        const sourceText = originalPlaceholders.get(element);
        element.placeholder = language === "english" ? sourceText : (translations[language][sourceText] || sourceText);
      });
    };
    const timer = window.setTimeout(applyTranslation, 0);
    const observer = new MutationObserver(() => window.setTimeout(applyTranslation, 0));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { window.clearTimeout(timer); observer.disconnect(); };
  }, [language]);
  return null;
}

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const location = useLocation();
  const [container, setContainer] = useState(null);

  useEffect(() => {
    setContainer(document.querySelector(".navbar") || document.querySelector(".sidebar") || document.querySelector(".tracking-header") || document.querySelector(".auth-card"));
  }, [location.pathname]);

  if (!container) return null;
  return createPortal(<label className="language-selector"><span>Language</span><select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Choose language"><option value="english">English</option><option value="hindi">Hindi</option><option value="gujarati">Gujarati</option></select></label>, container);
}
