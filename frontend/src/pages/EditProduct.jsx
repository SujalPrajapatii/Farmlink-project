import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { getDefaultProduceImage, handleImageError } from "../productImages";

function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const currentUser = JSON.parse(
    localStorage.getItem("farmlinkCurrentUser") || "null"
  );

  const accountType = currentUser?.accountType;

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    quantity: "",
    unit: "kg",
    price: "",
    location: "",
    image: "",
    tier1DiscountPct: "10",
    tier2DiscountPct: "20",
  });

  const [loading, setLoading] = useState(true);
  const [productFound, setProductFound] = useState(true);

  const autoImage = getDefaultProduceImage(formData.category, formData.name);
  const displayImage = formData.image?.trim() || autoImage;

  useEffect(() => {
    if (accountType !== "farmer") return;

    async function loadProduct() {
      try {
        const products = await api("/products/mine");

        const product = products.find(
          (item) => String(item.id) === String(id)
        );

        if (!product) {
          setProductFound(false);
          return;
        }

        setFormData({
          name: product.name || "",
          category: product.category || "",
          quantity: product.quantity || "",
          unit: product.unit || "kg",
          price: product.price || "",
          location: product.location || "",
          image: product.image || "",
          tier1DiscountPct: String(product.tier1DiscountPct ?? 10),
          tier2DiscountPct: String(product.tier2DiscountPct ?? 20),
        });
      } catch (error) {
        alert(error.message);
        setProductFound(false);
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id, accountType]);

  function handleChange(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const payload = {
      ...formData,
      image: formData.image?.trim() || autoImage,
    };

    try {
      await api(`/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      alert("Product updated successfully!");
      navigate("/farmer-dashboard");
    } catch (error) {
      alert(error.message);
    }
  }

  if (!currentUser || accountType !== "farmer") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Access denied</h1>
          <p>Please log in as a farmer to edit products.</p>

          <Link className="farmer-btn" to="/login">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Loading product...</h1>
        </div>
      </div>
    );
  }

  if (!productFound) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Product not found</h1>
          <p>You cannot edit this product.</p>

          <Link className="farmer-btn" to="/farmer-dashboard">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page auth-showcase-page">
      <div className="auth-showcase auth-showcase-edit">
        <section className="auth-brand-panel">
          <div className="auth-brand-content">
            <Link className="auth-brand-logo" to="/">Farm<span>Link</span></Link>
            <div className="auth-brand-copy">
              <span className="auth-leaf">🌾</span>
              <h2>Update harvest.<br />Keep stock accurate.</h2>
              <p>Modify price, available quantity, or location so buyers always see current harvest data.</p>
            </div>
            <span className="auth-brand-caption">LIVE MARKETPLACE · FARM DIRECT</span>
          </div>
        </section>

        <form className="auth-card auth-showcase-form auth-product-form" onSubmit={handleSubmit}>
          <Link className="back-link" to="/farmer-dashboard">
            ← Back to Dashboard
          </Link>

          <div className="auth-form-heading">
            <span>MANAGE HARVEST</span>
            <h1>Edit Product</h1>
            <p>Update your crop listing details.</p>
          </div>

          <label>Product Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
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
                min="0"
                step="1"
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
                min="1"
                step="0.01"
                required
              />
            </div>
          </div>

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 16px", margin: "14px 0 10px" }}>
            <strong style={{ display: "block", color: "#166534", marginBottom: "4px", fontSize: "14px" }}>
              🏷️ Wholesale Bulk Discounts (Percentage)
            </strong>
            <p style={{ margin: "0 0 12px", fontSize: "12px", color: "#64748b" }}>
              Encourage buyers to purchase in larger volumes by setting percentage discounts on quantity tiers.
            </p>

            <div className="auth-two-fields">
              <div>
                <label style={{ fontSize: "12px" }}>51–200 {formData.unit} (% OFF)</label>
                <input
                  type="number"
                  name="tier1DiscountPct"
                  min="0"
                  max="90"
                  value={formData.tier1DiscountPct}
                  onChange={handleChange}
                  placeholder="10"
                />
              </div>
              <div>
                <label style={{ fontSize: "12px" }}>201+ {formData.unit} (% OFF)</label>
                <input
                  type="number"
                  name="tier2DiscountPct"
                  min="0"
                  max="90"
                  value={formData.tier2DiscountPct}
                  onChange={handleChange}
                  placeholder="20"
                />
              </div>
            </div>

            {formData.price && Number(formData.price) > 0 && (
              <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "8px 12px", marginTop: "10px", fontSize: "12px", color: "#334155" }}>
                <span style={{ fontWeight: 700, color: "#1e293b" }}>Calculated Selling Rates:</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "6px" }}>
                  <div>1–50 {formData.unit}: <strong>₹{Number(formData.price).toFixed(2)}</strong></div>
                  <div>51–200 {formData.unit}: <strong style={{ color: "#15803d" }}>₹{(Number(formData.price) * (1 - (Number(formData.tier1DiscountPct) || 0) / 100)).toFixed(2)}</strong> <small style={{ color: "#16a34a" }}>({formData.tier1DiscountPct || 0}% off)</small></div>
                  <div>201+ {formData.unit}: <strong style={{ color: "#15803d" }}>₹{(Number(formData.price) * (1 - (Number(formData.tier2DiscountPct) || 0) / 100)).toFixed(2)}</strong> <small style={{ color: "#16a34a" }}>({formData.tier2DiscountPct || 0}% off)</small></div>
                </div>
              </div>
            )}
          </div>

          <label>Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
          />

          <label>Product Photo Preview</label>
          <div className="auth-preview-box">
            <img
              src={displayImage}
              alt="Product preview"
              onError={(e) => handleImageError(e, formData.category, formData.name)}
            />
            <div className="auth-preview-info">
              <strong>{formData.name.trim() || formData.category}</strong>
              <small>
                {formData.image?.trim() ? "✓ Using custom photo URL" : "✨ Auto-selected by crop type & category"}
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
            Save Changes <span>✓</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditProduct;