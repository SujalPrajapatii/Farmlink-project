import { api } from "../api";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function AddProduct() {
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

  function handleChange(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) 
  {
    event.preventDefault();

    try {
      await api("/products", {
        method: "POST",
        body: JSON.stringify(formData),
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
          <Link className="farmer-btn" to="/login">
            Go to Login
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

        <h1>Add Product</h1>
        <p>Add your crop details for businesses to find.</p>

        <label>Product Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Example: Fresh Tomatoes"
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
          placeholder="Example: 100"
          min="1"
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
          placeholder="Example: 30"
          min="1"
          required
        />

        <label>Location</label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="Example: Nashik, Maharashtra"
          required
        />

        <label>Image URL (optional)</label>
        <input
          type="url"
          name="image"
          value={formData.image}
          onChange={handleChange}
          placeholder="Paste an image link"
        />

        <button className="farmer-btn" type="submit">
          Add Product
        </button>
      </form>
    </div>
  );
}

export default AddProduct;