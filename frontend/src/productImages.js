export const CATEGORY_IMAGES = {
  vegetables: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1000&q=85",
  fruits: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1000&q=85",
  grains: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1000&q=85",
  pulses: "https://plus.unsplash.com/premium_photo-1699453179951-4f51c39644ac?auto=format&fit=crop&w=1000&q=85",
  other: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=85",
};

export const ITEM_SPECIFIC_IMAGES = [
  // Vegetables
  { match: ["tomato", "tamatar", "tomatoes"], image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=1000&q=80" },
  { match: ["potato", "potatoes", "aloo", "batata", "alu"], image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=1000&q=80" },
  { match: ["onion", "onions", "pyaz", "kanda"], image: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=1000&q=80" },
  { match: ["carrot", "carrots", "gajar"], image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=1000&q=80" },
  { match: ["spinach", "palak", "lettuce", "greens", "methi", "coriander", "dhaniya", "mint", "pudina"], image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=1000&q=80" },
  { match: ["cabbage", "cauliflower", "gobi", "patta gobi", "phool gobi", "broccoli"], image: "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?auto=format&fit=crop&w=1000&q=80" },
  { match: ["chilli", "chili", "mirchi", "pepper", "capsicum", "shimla"], image: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=1000&q=80" },
  { match: ["garlic", "lahsun", "lehsan"], image: "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&w=1000&q=80" },
  { match: ["ginger", "adrak"], image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=1000&q=80" },
  { match: ["brinjal", "eggplant", "baingan", "aubergine"], image: "https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=1000&q=80" },
  { match: ["cucumber", "kheera", "kakdi"], image: "https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=1000&q=80" },
  { match: ["ladyfinger", "bhindi", "okra", "lady finger"], image: "https://images.unsplash.com/photo-1425543103986-22abb7d7e8d2?auto=format&fit=crop&w=1000&q=80" },
  { match: ["peas", "matar", "green peas"], image: "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?auto=format&fit=crop&w=1000&q=80" },
  { match: ["pumpkin", "kaddu", "squash", "sitaphal"], image: "https://images.unsplash.com/photo-1506917728037-b6af01a7d403?auto=format&fit=crop&w=1000&q=80" },
  { match: ["bottle gourd", "lauki", "doodhi", "bitter gourd", "karela", "ridge gourd", "turai", "zucchini", "gourd"], image: "https://images.unsplash.com/photo-1590165482129-1b8b27698780?auto=format&fit=crop&w=1000&q=80" },
  { match: ["radish", "mooli", "beetroot", "chukandar", "turnip", "shalgam"], image: "https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?auto=format&fit=crop&w=1000&q=80" },
  { match: ["mushroom", "mushrooms", "khumb"], image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80" },
  
  // Fruits
  { match: ["apple", "apples", "seb"], image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=1000&q=80" },
  { match: ["banana", "bananas", "kela"], image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=1000&q=80" },
  { match: ["mango", "mangoes", "aam"], image: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1000&q=80" },
  { match: ["orange", "oranges", "santra", "mosambi", "citrus", "lemon", "nimbu", "lime", "mandarin"], image: "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?auto=format&fit=crop&w=1000&q=80" },
  { match: ["grape", "grapes", "angoor"], image: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=1000&q=80" },
  { match: ["watermelon", "melon", "tarbooz", "kharbooja", "muskmelon", "cantaloupe"], image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=1000&q=80" },
  { match: ["papaya", "papita"], image: "https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?auto=format&fit=crop&w=1000&q=80" },
  { match: ["pineapple", "ananas"], image: "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=1000&q=80" },
  { match: ["guava", "amrood", "pomegranate", "anar"], image: "https://images.unsplash.com/photo-1541344999736-83eca872f241?auto=format&fit=crop&w=1000&q=80" },
  { match: ["strawberry", "strawberries", "berry", "berries", "blueberry"], image: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=1000&q=80" },
  { match: ["coconut", "nariyal"], image: "https://images.unsplash.com/photo-1544376798-89aa6b82c6cd?auto=format&fit=crop&w=1000&q=80" },

  // Grains
  { match: ["wheat", "gehu", "atta", "flour", "grain", "barley", "jowar", "bajra", "millet", "ragi", "oats"], image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1000&q=80" },
  { match: ["rice", "chawal", "paddy", "basmati"], image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=1000&q=80" },
  { match: ["corn", "maize", "makka", "bhutta", "sweetcorn"], image: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=1000&q=80" },

  // Pulses
  { match: ["pulse", "pulses", "dal", "daal", "lentil", "lentils", "chana", "chickpea", "moong", "toor", "urad", "rajma", "gram", "beans", "soya", "soyabean", "soybean"], image: "https://plus.unsplash.com/premium_photo-1699453179951-4f51c39644ac?auto=format&fit=crop&w=1000&q=85" },
  
  // Spices / Other
  { match: ["turmeric", "haldi", "mustard", "sarson", "rai", "cumin", "jeera", "cardamom", "elaichi", "clove", "laung", "cinnamon", "dalchini", "spice", "spices"], image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1000&q=80" },
  { match: ["peanut", "groundnut", "mungfali", "moongphali", "almond", "badam", "cashew", "kaju", "walnut", "akhrot", "nut", "nuts"], image: "https://images.unsplash.com/photo-1567892328221-1c22937e1b7a?auto=format&fit=crop&w=1000&q=80" },
  { match: ["sugarcane", "ganna", "jaggery", "gur", "sugar", "honey", "shehed"], image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1000&q=80" },
];

export function getCategoryKey(category) {
  const norm = String(category || "").toLowerCase().trim();
  if (norm === "all") return "all";
  if (norm.includes("veg")) return "vegetables";
  if (norm.includes("fruit")) return "fruits";
  if (norm.includes("grain") || norm.includes("cereal") || norm.includes("wheat") || norm.includes("rice")) return "grains";
  if (norm.includes("pulse") || norm.includes("dal") || norm.includes("lentil") || norm.includes("bean") || norm.includes("chana") || norm.includes("gram")) return "pulses";
  return "other";
}

export function getDefaultProduceImage(category, productName = "") {
  const searchStr = `${productName || ""} ${category || ""}`.toLowerCase().trim();
  
  for (const item of ITEM_SPECIFIC_IMAGES) {
    if (item.match.some((keyword) => searchStr.includes(keyword))) {
      return item.image;
    }
  }

  const key = getCategoryKey(category);
  return CATEGORY_IMAGES[key] || CATEGORY_IMAGES.vegetables;
}

export function getProductImage(productOrCategory, productName = "") {
  if (typeof productOrCategory === "object" && productOrCategory !== null) {
    const { image, category, name } = productOrCategory;
    if (image && typeof image === "string" && image.trim().length > 0 && !image.includes("placehold.co") && !image.endsWith(".svg")) {
      return image.trim();
    }
    return getDefaultProduceImage(category, name || productName);
  }

  return getDefaultProduceImage(productOrCategory, productName);
}

export function handleImageError(event, fallbackCategory = "vegetables", fallbackName = "") {
  const fallback = getDefaultProduceImage(fallbackCategory, fallbackName);
  if (event.target && event.target.src !== fallback) {
    event.target.src = fallback;
  }
}
