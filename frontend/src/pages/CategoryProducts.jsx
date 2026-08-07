import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";

const categoryNames = {
  vegetables: "Vegetables",
  fruits: "Fruits",
  grains: "Grains",
  pulses: "Pulses",
};

function categoryMatches(productCategory, selectedCategory) {
  const normalise = (value) => String(value || "").toLowerCase().replace(/s$/, "");
  return normalise(productCategory) === normalise(selectedCategory);
}

function CategoryProducts() {
  const { category } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const categoryName = categoryNames[category?.toLowerCase()] || category;

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        setError("");
        setProducts(await api("/products"));
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const categoryProducts = useMemo(
    () => products.filter((product) => categoryMatches(product.category, category)),
    [products, category]
  );

  return (
    <div className="category-page">
      <header className="navbar">
        <Link className="logo" to="/">FarmLink</Link>
        <Link className="login-btn" to="/">Back to Home</Link>
      </header>
      <main className="category-content">
        <Link className="back-link" to="/#categories">Back to all categories</Link>
        <p className="section-tag">CROP CATEGORY</p>
        <h1>{categoryName}</h1>
        <p className="category-description">Fresh {categoryName?.toLowerCase()} listed by FarmLink farmers.</p>
        {loading && <p className="category-message">Loading products...</p>}
        {error && <p className="category-message category-error">{error}</p>}
        {!loading && !error && categoryProducts.length === 0 && (
          <div className="empty-product">
            <div>No products</div>
            <h3>No {categoryName?.toLowerCase()} available yet</h3>
            <p>Farmers have not added products in this category yet. Please check again later.</p>
          </div>
        )}
        {!loading && !error && categoryProducts.length > 0 && (
          <div className="product-grid">
            {categoryProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <img src={product.image || "https://placehold.co/600x400?text=FarmLink"} alt={product.name} />
                <h3>{product.name}</h3>
                <p>{product.category}</p>
                <p>Available: {product.quantity} {product.unit}</p>
                <strong>Rs. {product.price} / {product.unit}</strong>
                <p>{product.location}</p>
                <p className="muted-text">Farmer: {product.ownerName}</p>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default CategoryProducts;
