import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const currentUser = JSON.parse(
    localStorage.getItem("farmlinkCurrentUser") || "null"
  );

  const products = JSON.parse(
    localStorage.getItem("farmlinkProducts") || "[]"
  );

  const selectedProduct = products.find(
    (product) => String(product.id) === String(id)
  );

  const [formData, setFormData] = useState(
    selectedProduct || {
      name: "",
      category: "",
      quantity: "",
      unit: "kg",
      price: "",
      location: "",
      image: "",
    }
  );

  function handleChange(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  function handleSubmit(event) {
    event.preventDefault();

    const updatedProducts = products.map((product) => {
      if (String(product.id) === String(id)) {
        return {
          ...product,
          ...formData,
          quantity: Number(formData.quantity),
          price: Number(formData.price),
        };
      }

      return product;
    });

    localStorage.setItem("farmlinkProducts", JSON.stringify(updatedProducts));
    alert("Product updated successfully!");
    navigate("/farmer-dashboard");
  }

  if (
    !currentUser ||
    currentUser.accountType !== "farmer" ||
    !selectedProduct ||
    selectedProduct.ownerEmail !== currentUser.email
  ) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Access denied</h1>
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

        <label>Image URL</label>
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