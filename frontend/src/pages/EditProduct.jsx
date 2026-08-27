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
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <Link className="back-link" to="/farmer-dashboard">
          ← Back to Dashboard
        </Link>

        <h1>Edit Product</h1>
        <p>Update your crop listing details.</p>

        <label>Product Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />

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

        <label>Location</label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          required
        />

        <label>Product Photo Preview</label>
        <div style={{ marginTop: "6px", marginBottom: "14px" }}>
          <img
            src={displayImage}
            alt="Product preview"
            onError={(e) => handleImageError(e, formData.category, formData.name)}
            style={{ width: "100%", height: "170px", objectFit: "cover", borderRadius: "12px", border: "1px solid #d7e4d6", display: "block" }}
          />
          <small style={{ display: "block", marginTop: "6px", color: "#457353", fontWeight: "600" }}>
            {formData.image?.trim() ? "✓ Using custom photo URL" : "✨ Auto-selected by crop type & category"}
          </small>
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
          Save Changes
        </button>
      </form>
    </div>
  );
}

export default EditProduct;