import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const currentUser = JSON.parse(
    localStorage.getItem("farmlinkCurrentUser") || "null"
  );

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

  useEffect(() => {
    async function loadProduct() {
      // User is not logged in as farmer
      if (!currentUser || currentUser.accountType !== "farmer") {
        setLoading(false);
        return;
      }

      try {
        // Get only products owned by logged-in farmer
        const products = await api("/products/mine");

        // Find product matching ID from URL
        const product = products.find(
          (item) => String(item.id) === String(id)
        );

        if (!product) {
          setProductFound(false);
          return;
        }

        // Fill form fields with existing product data
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
  }, [id]);

  function handleChange(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      await api(`/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });

      alert("Product updated successfully!");
      navigate("/farmer-dashboard");
    } catch (error) {
      alert(error.message);
    }
  }

  // User is not farmer or not logged in
  if (!currentUser || currentUser.accountType !== "farmer") {
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

  // API is loading existing product data
  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Loading product...</h1>
        </div>
      </div>
    );
  }

  // Product ID is invalid or belongs to another farmer
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
          <option value="">Select category</option>
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

        <label>Image URL (optional)</label>
        <input
          type="url"
          name="image"
          value={formData.image}
          onChange={handleChange}
          placeholder="Paste an image URL"
        />

        <button className="farmer-btn" type="submit">
          Save Changes
        </button>
      </form>
    </div>
  );
}

export default EditProduct;