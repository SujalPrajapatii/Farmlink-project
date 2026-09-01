import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { CATEGORY_IMAGES, getCategoryKey, getProductImage, handleImageError } from "../productImages";
import { getTierPricing } from "../pricing";

const categoryNames = {
  vegetables: "Vegetables",
  fruits: "Fruits",
  grains: "Grains",
  pulses: "Pulses",
  all: "All Produce",
};

function categoryMatches(productCategory, selectedCategory) {
  if (!selectedCategory || selectedCategory.toLowerCase() === "all") return true;
  return getCategoryKey(productCategory) === getCategoryKey(selectedCategory);
}

function CategoryProducts() {
  const { category = "vegetables" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState({});
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("farmlinkCart") || "[]"));

  const normalizedKey = getCategoryKey(category);
  const categoryName = categoryNames[normalizedKey] || categoryNames[category?.toLowerCase()] || category;
  const categoryBannerImage = CATEGORY_IMAGES[normalizedKey] || CATEGORY_IMAGES.vegetables;

  const currentUser = JSON.parse(localStorage.getItem("farmlinkCurrentUser") || "null");
  const dashboardPath = currentUser?.accountType === "farmer"
    ? "/farmer-dashboard"
    : currentUser?.accountType === "business"
      ? "/business-dashboard"
      : currentUser?.accountType === "delivery"
        ? "/delivery-dashboard"
        : currentUser?.accountType === "admin"
          ? "/admin-dashboard"
          : null;

  function updateCart(nextCart) {
    setCart(nextCart);
    localStorage.setItem("farmlinkCart", JSON.stringify(nextCart));
  }

  function handleAddToCart(product) {
    if (!currentUser) {
      alert("Please log in as a buyer to add products to your cart.");
      navigate("/login", { state: { from: location } });
      return;
    }

    const requestedQuantity = Number(quantity[product.id] || 1);
    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > Number(product.quantity)) {
      alert(`Enter a whole quantity between 1 and ${product.quantity}.`);
      return;
    }

    const existing = cart.find((item) => item.product.id === product.id);
    const nextCart = existing
      ? cart.map((item) => item.product.id === product.id ? { ...item, quantity: requestedQuantity } : item)
      : [...cart, { product, quantity: requestedQuantity }];

    updateCart(nextCart);
    alert(`${product.name} (${requestedQuantity} ${product.unit}) added to cart.`);
  }

  function handleBuyNow(product) {
    if (!currentUser) {
      alert("Please log in as a buyer to buy products.");
      navigate("/login", { state: { from: location } });
      return;
    }

    const requestedQuantity = Number(quantity[product.id] || 1);
    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > Number(product.quantity)) {
      alert(`Enter a whole quantity between 1 and ${product.quantity}.`);
      return;
    }

    navigate("/checkout", {
      state: {
        product,
        quantity: requestedQuantity,
      },
    });
  }

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        setError("");
        const data = await api("/products");
        setProducts(data || []);
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
        <Link className="logo" to="/">Farm<span>Link</span></Link>
        <div className="nav-buttons">
          {cart.length > 0 && (
            <button
              className="login-btn"
              style={{ fontWeight: "700" }}
              onClick={() => navigate("/checkout", { state: { cart } })}
            >
              🛒 Cart ({cart.length})
            </button>
          )}
          {dashboardPath ? (
            <Link className="register-btn" to={dashboardPath}>My Dashboard</Link>
          ) : (
            <Link className="login-btn" to="/login" state={{ from: location }}>Login</Link>
          )}
          <Link className="login-btn" to="/">Back to Home</Link>
        </div>
      </header>

      <main className="category-content">
        <div className="category-hero-card" style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "20px",
          marginBottom: "35px",
          minHeight: "220px",
          display: "flex",
          alignItems: "flex-end",
          padding: "35px",
          color: "white",
          boxShadow: "0 14px 35px rgba(23, 59, 39, 0.18)"
        }}>
          <img
            src={categoryBannerImage}
            alt={categoryName}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(0.55)",
              zIndex: 0
            }}
            onError={(e) => handleImageError(e, normalizedKey)}
          />
          <div style={{ position: "relative", zIndex: 1, maxWidth: "700px" }}>
            <Link className="back-link" to="/#categories" style={{ color: "#d1fae5", display: "inline-block", marginBottom: "10px" }}>
              ← Back to all categories
            </Link>
            <p className="section-tag" style={{ color: "#fef08a", margin: 0 }}>CROP CATEGORY EXPLORER</p>
            <h1 style={{ color: "white", margin: "6px 0 10px", fontSize: "clamp(32px, 4.5vw, 48px)" }}>{categoryName}</h1>
            <p style={{ color: "#e2e8f0", margin: 0, fontSize: "16px", lineHeight: "1.5" }}>
              Explore fresh {categoryName?.toLowerCase()} listed directly by verified FarmLink farmers.
            </p>
          </div>
        </div>

        <div className="market-category-pills" style={{ marginBottom: "30px" }} aria-label="Category Switcher">
          {["vegetables", "fruits", "grains", "pulses"].map((catKey) => {
            const isActive = normalizedKey === catKey;
            return (
              <button
                key={catKey}
                className={isActive ? "is-active" : ""}
                onClick={() => navigate(`/categories/${catKey}`)}
              >
                {catKey[0].toUpperCase() + catKey.slice(1)}
              </button>
            );
          })}
        </div>

        {loading && <p className="category-message">Loading fresh crops...</p>}

        {error && (
          <div className="category-message category-error">
            <p>{error}</p>
            {error.toLowerCase().includes("login") && (
              <Link className="category-login-action" to="/login" state={{ from: location }}>
                Log in to view products <span>→</span>
              </Link>
            )}
          </div>
        )}

        {!loading && !error && categoryProducts.length === 0 && (
          <div className="empty-product">
            <div>🧺</div>
            <h3>No {categoryName?.toLowerCase()} available yet</h3>
            <p>Farmers have not added products in this category yet. Please check back soon or explore other categories above.</p>
          </div>
        )}

        {!loading && !error && categoryProducts.length > 0 && (
          <div className="product-grid">
            {categoryProducts.map((product) => {
              const stock = Number(product.quantity) || 0;
              const reqQty = Number(quantity[product.id] || 1);
              const remainingStock = Math.max(stock - (Number.isFinite(reqQty) ? reqQty : 0), 0);
              const pricing = getTierPricing(product, reqQty);

              return (
                <article className="product-card market-product-card" key={product.id}>
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    onError={(event) => handleImageError(event, product.category, product.name)}
                  />
                  <span className="market-product-category">{product.category}</span>
                  <h3>{product.name}</h3>

                  <div style={{ margin: "4px 0" }}>
                    {pricing.isDiscounted ? (
                      <div>
                        <strong style={{ color: "#15803d" }}>
                          ₹{pricing.discountedUnitPrice.toFixed(2)} / {pricing.unit}
                        </strong>{" "}
                        <span style={{ textDecoration: "line-through", fontSize: "12px", color: "#94a3b8" }}>
                          ₹{product.price}
                        </span>{" "}
                        <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 6px", borderRadius: "999px", fontSize: "10px", fontWeight: 700 }}>
                          🏷️ {pricing.tierBadge}
                        </span>
                      </div>
                    ) : (
                      <strong>₹{product.price} / {product.unit}</strong>
                    )}
                  </div>

                  <div style={{ fontSize: "11px", background: "#f0fdf4", color: "#166534", padding: "4px 7px", borderRadius: "6px", margin: "4px 0 8px", border: "1px solid #bbf7d0" }}>
                    🏷️ <strong>Bulk Deals:</strong> {pricing.tier1Pct}% off ({pricing.tier1Min}+ {pricing.unit}) · {pricing.tier2Pct}% off ({pricing.tier2Min}+ {pricing.unit})
                  </div>

                  <p className="muted-text">Grown by {product.ownerName || "Local Farmer"} · {product.location}</p>

                  <label className="quantity-label">Order Quantity ({pricing.unit})</label>
                  <input
                    className="quantity-input"
                    type="number"
                    min="1"
                    step="1"
                    max={product.quantity}
                    value={quantity[product.id] || 1}
                    onChange={(event) =>
                      setQuantity({
                        ...quantity,
                        [product.id]: event.target.value,
                      })
                    }
                  />

                  {pricing.isDiscounted && (
                    <p style={{ margin: "2px 0 6px", fontSize: "12px", color: "#16a34a", fontWeight: 700 }}>
                      ✨ Tier Applied: Total ₹{pricing.total.toFixed(2)} (Save ₹{pricing.savings.toFixed(2)})
                    </p>
                  )}

                  <p className="available-stock">
                    Available stock after this order: {remainingStock.toLocaleString("en-IN", { maximumFractionDigits: 2 })} {product.unit}
                  </p>

                  <button
                    className="register-btn full-width"
                    onClick={() => handleBuyNow(product)}
                  >
                    Buy Now {pricing.isDiscounted ? `(₹${pricing.total.toFixed(2)})` : ""}
                  </button>
                  <button
                    className="login-btn full-width cart-button"
                    onClick={() => handleAddToCart(product)}
                  >
                    Add to Cart
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default CategoryProducts;


