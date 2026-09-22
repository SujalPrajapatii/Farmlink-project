import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { getDefaultProduceImage, handleImageError } from "../productImages";

function AddProduct() {
  const navigate = useNavigate();

  const currentUser = JSON.parse(
    localStorage.getItem("farmlinkCurrentUser") || "null"
  );

  const [formData, setFormData] = useState({
    name: "",
    category: "Vegetables",
    quantity: "",
    unit: "kg",
    price: "",
    location: "",
    image: "",
  });

  const autoImage = getDefaultProduceImage(formData.category, formData.name);
  const displayImage = formData.image?.trim() || autoImage;

  function handleChange(event) {
    const { name, value } = event.target;

    if (name === "name") {
      const lower = value.toLowerCase();
      let autoCategory = "";

      const fruitKeywords = [
        "apple", "banana", "mango", "orange", "santra", "grape", "angoor",
        "watermelon", "tarbooz", "melon", "papaya", "pineapple", "guava",
        "amrood", "pomegranate", "strawberry", "berry", "coconut", "lemon",
        "citrus", "lime"
      ];
      const grainKeywords = [
        "wheat", "gehu", "atta", "flour", "rice", "chawal", "paddy",
        "basmati", "corn", "maize", "makka", "barley", "jowar", "bajra",
        "millet", "ragi", "oats"
      ];
      const pulseKeywords = [
        "pulse", "dal", "daal", "lentil", "chana", "chickpea", "moong",
        "toor", "urad", "rajma", "beans", "soya", "soyabean", "soybean", "gram"
      ];
      const vegKeywords = [
        "tomato", "tamatar", "potato", "aloo", "batata", "onion", "pyaz",
        "kanda", "carrot", "gajar", "spinach", "palak", "cabbage", "cauliflower",
        "gobi", "chilli", "mirchi", "garlic", "lahsun", "ginger", "adrak",
        "brinjal", "baingan", "cucumber", "kheera", "ladyfinger", "bhindi",
        "okra", "peas", "matar", "pumpkin", "kaddu", "lauki", "radish",
        "mooli", "mushroom", "beetroot"
      ];

      if (fruitKeywords.some((k) => lower.includes(k))) autoCategory = "Fruits";
      else if (grainKeywords.some((k) => lower.includes(k))) autoCategory = "Grains";
      else if (pulseKeywords.some((k) => lower.includes(k))) autoCategory = "Pulses";
      else if (vegKeywords.some((k) => lower.includes(k))) autoCategory = "Vegetables";

      setFormData((prev) => ({
        ...prev,
        name: value,
        category: autoCategory || prev.category,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const payload = {
      ...formData,
      image: formData.image?.trim() || autoImage,
    };

    try {
      await api("/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      alert("Product added successfully!");
      navigate("/farmer-dashboard");
    } catch (error) {
      alert(error.message);
    }
  }

  if (!currentUser || currentUser.accountType !== "farmer") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Access denied</h1>
          <p>Please log in as a farmer to add products.</p>
          <Link className="farmer-btn" to="/login">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page auth-showcase-page">
      <div className="auth-showcase auth-showcase-product">
        <section className="auth-brand-panel">
          <div className="auth-brand-content">
            <Link className="auth-brand-logo" to="/">
              Farm<span>Link</span>
            </Link>
            <div className="auth-brand-copy">
              <span className="auth-leaf">🌾</span>
              <h2>Fresh harvest.<br />Direct to market.</h2>
              <p>
                List your produce directly from your farm and connect with
                verified buyers across the region.
              </p>
            </div>
            <span className="auth-brand-caption">
              FARM FRESH · DIRECT TRADE
            </span>
          </div>
        </section>

        <form
          className="auth-card auth-showcase-form auth-product-form"
          onSubmit={handleSubmit}
        >
          <Link className="back-link" to="/farmer-dashboard">
            ← Back to Dashboard
          </Link>

          <div className="auth-form-heading">
            <span>NEW LISTING</span>
            <h1>Add Product</h1>
            <p>Add your crop details for businesses to find.</p>
          </div>

          <label>Product Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Example: Fresh Tomatoes, Wheat, Basmati Rice"
            required
          />

          <div className="auth-two-fields">
            <div>
              <label>Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="Vegetables">Vegetables</option>
                <option value="Fruits">Fruits</option>
                <option value="Grains">Grains</option>
                <option value="Pulses">Pulses</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label>Available Quantity</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="Example: 100"
                min="1"
                required
              />
            </div>
          </div>

          <div className="auth-two-fields">
            <div>
              <label>Unit</label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                required
              >
                <option value="kg">kg</option>
                <option value="quintal">quintal</option>
                <option value="bag">bag</option>
                <option value="crate">crate</option>
              </select>
            </div>
            <div>
              <label>Price Per Unit (₹)</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="Example: 30"
                min="1"
                step="0.01"
                required
              />
            </div>
          </div>

          <label>Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Example: Nashik, Maharashtra"
            required
          />

          <label>Product Photo Preview</label>
          <div className="auth-preview-box">
            <img
              src={displayImage}
              alt="Product preview"
              onError={(e) =>
                handleImageError(e, formData.category, formData.name)
              }
            />
            <div className="auth-preview-info">
              <strong>
                {formData.name.trim() || formData.category || "Produce Preview"}
              </strong>
              <small>
                {formData.image?.trim()
                  ? "✓ Using custom photo URL"
                  : "✨ Auto-selected by crop type & category"}
              </small>
            </div>
          </div>

          <label>Custom Image URL (optional)</label>
          <input
            type="url"
            name="image"
            value={formData.image}
            onChange={handleChange}
            placeholder="Leave blank to use the auto-selected photo above"
          />

          <button className="farmer-btn" type="submit">
            Add Product <span>→</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddProduct;