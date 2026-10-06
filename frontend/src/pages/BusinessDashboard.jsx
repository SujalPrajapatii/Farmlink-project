import { api } from "../api";
import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { CATEGORY_IMAGES, getCategoryKey, getProductImage, handleImageError } from "../productImages";
import { getTierPricing } from "../pricing";

function BusinessDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentUser = JSON.parse(
    localStorage.getItem("farmlinkCurrentUser") || "null"
  );

  const accountType = currentUser?.accountType;

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("search") || "";
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get("search");
    if (searchParam !== null) {
      setSearch(searchParam);
    }
  }, [location.search]);
  const [quantity, setQuantity] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("farmlinkCart") || "[]"));
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  function updateCart(nextCart) {
    setCart(nextCart);
    localStorage.setItem("farmlinkCart", JSON.stringify(nextCart));
  }

  function addToCart(product) {
    if (!currentUser || currentUser.accountType !== "business") {
      alert("Please login as buyer to purchase.");
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
    alert("Product added to cart.");
  }

  useEffect(() => {
    if (!currentUser) return;

    let active = true;
    let firstLoad = true;

    async function loadDashboardData() {
      try {
        const [productsData, notificationsData] = await Promise.all([
          api("/products"),
          api("/orders/notifications"),
        ]);

        if (!active) return;
        setProducts(productsData || []);
        setNotifications(notificationsData || []);
      } catch (error) {
        if (firstLoad && active) alert(error.message);
      } finally {
        firstLoad = false;
      }
    }

    loadDashboardData();
    window.addEventListener("focus", loadDashboardData);
    const refreshId = window.setInterval(loadDashboardData, 5000);

    return () => {
      active = false;
      window.removeEventListener("focus", loadDashboardData);
      window.clearInterval(refreshId);
    };
  }, [currentUser?.id]);

  if (!currentUser) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Access denied</h1>
          <p>Please log in to continue.</p>

          <Link className="farmer-btn" to="/login">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const filteredProducts = products.filter((product) => {
    const searchableText =
      `${product.name} ${product.category} ${product.location}`.toLowerCase();

    return (
      Number(product.quantity) > 0 &&
      (selectedCategory === "all" || getCategoryKey(product.category) === getCategoryKey(selectedCategory)) &&
      searchableText.includes(search.toLowerCase())
    );
  });
  const unreadNotificationCount = notifications.filter((notification) => !notification.isRead).length;

  async function openNotification(notification) {
    try {
      if (!notification.isRead) {
        await api(`/orders/notifications/${notification.id}/read`, { method: "PATCH" });
        setNotifications((currentNotifications) => currentNotifications.map((current) => (
          current.id === notification.id ? { ...current, isRead: true } : current
        )));
      }
      navigate(`/orders/${notification.orderId}/tracking`);
    } catch (error) {
      alert(error.message);
    }
  }

  function availableStockAfterOrder(product) {
    const stock = Number(product.quantity) || 0;
    const requestedQuantity = Number(quantity[product.id] || 1);

    return Math.max(stock - (Number.isFinite(requestedQuantity) ? requestedQuantity : 0), 0);
  }

  function handleLogout() {
    localStorage.removeItem("farmlinkToken");
    localStorage.removeItem("farmlinkCurrentUser");
    navigate("/");
  }

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <h2>🌱 FarmLink</h2>
        <Link to="/" className="sidebar-nav-item">🏠 Home</Link>
        <Link to="/business-dashboard" className="sidebar-nav-item is-active">🌾 Marketplace</Link>
        <Link to="/my-orders" className="sidebar-nav-item">📦 My Orders</Link>
        <button type="button" className="sidebar-nav-item" onClick={() => navigate("/checkout", { state: { cart } })}>
          🛒 Cart {cart.length > 0 && <span className="nav-count-badge">{cart.length}</span>}
        </button>
        <Link to="/notifications" className="sidebar-nav-item">
          🔔 Notifications {unreadNotificationCount > 0 && <span className="nav-count-badge alert">{unreadNotificationCount}</span>}
        </Link>

        <button className="sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="dashboard-content business-marketplace">
        <section className="market-hero">
          <div className="market-hero-copy">
            <p className="section-tag">FARMLINK MARKETPLACE</p>
            <h1>Welcome, {currentUser.name}!<br /><em>Fresh produce, direct from farms.</em></h1>
            <p>Discover quality crops from trusted growers. Clear pricing, available stock, and easy delivery tracking.</p>

            <div className="buyer-hero-search-wrapper">
              <div className="buyer-hero-search-bar">
                <span className="buyer-search-icon" aria-hidden="true">🔍</span>
                <input
                  type="text"
                  className="buyer-search-input"
                  placeholder="Search produce by crop name, category, or farm location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    className="buyer-search-clear"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="buyer-hero-tags">
                <span className="buyer-tag-label">Popular:</span>
                {["Tomatoes", "Potatoes", "Onions", "Wheat", "Mangoes"].map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    className={`buyer-tag-pill ${search.toLowerCase() === tag.toLowerCase() ? "is-active" : ""}`}
                    onClick={() => setSearch(search.toLowerCase() === tag.toLowerCase() ? "" : tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <a className="market-hero-action" href="#products">Browse fresh produce <span>↓</span></a>
          </div>
          <div className="market-hero-image"><img src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=88" alt="Farmer harvesting fresh vegetables" /><div><span>✓</span><p><strong>Farm-fresh quality</strong><br />From verified growers</p></div></div>
        </section>

        <section className="market-trust" aria-label="FarmLink buyer benefits"><article><span>✓</span><div><strong>Verified farmers</strong><p>Trade directly with growers</p></div></article><article><span>◈</span><div><strong>Clear pricing</strong><p>No hidden marketplace fees</p></div></article><article><span>⌁</span><div><strong>Live order tracking</strong><p>Stay updated through delivery</p></div></article><article><span>✦</span><div><strong>Freshness first</strong><p>Harvested for your business</p></div></article></section>

        {notificationsOpen && (
          <section className="product-section order-notifications" aria-live="polite">
            <h2>Order Notifications</h2>
            {notifications.length === 0 ? <p className="muted-text">You have no notifications.</p> : (
              <div className="notification-list">
                {notifications.map((notification) => (
                  <button className={`order-notification ${notification.isRead ? "is-read" : "is-unread"}`} key={notification.id} type="button" onClick={() => openNotification(notification)}>
                    <strong>{notification.title || "Order Cancelled"}</strong>
                    <span>{notification.message}</span>
                    <time dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString()}</time>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="market-category-wrapper" id="products">
          <div className="market-category-heading">
            <p className="section-tag">EXPLORE CATEGORIES</p>
            <h2>Fresh picks for your business.</h2>
            <p>Welcome back, {currentUser.name}. Explore farm produce by category or search below.</p>
          </div>

          <div className="market-category-cards">
            {[
              { key: "vegetables", name: "Vegetables", image: CATEGORY_IMAGES.vegetables },
              { key: "fruits", name: "Fruits", image: CATEGORY_IMAGES.fruits },
              { key: "grains", name: "Grains", image: CATEGORY_IMAGES.grains },
              { key: "pulses", name: "Pulses", image: CATEGORY_IMAGES.pulses },
            ].map((cat) => (
              <div
                key={cat.key}
                className={`category-card market-category-card ${selectedCategory === cat.key ? "is-selected-card" : ""}`}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedCategory(selectedCategory === cat.key ? "all" : cat.key)}
              >
                <img src={cat.image} alt={cat.name} onError={(e) => handleImageError(e, cat.key)} />
                <span>
                  {cat.name}
                  <small>{selectedCategory === cat.key ? "✓ Active Filter" : "Explore →"}</small>
                </span>
              </div>
            ))}
          </div>

          <div className="market-toolbar">
            <div className="market-category-pills" aria-label="Product categories">
              <button
                className={selectedCategory === "all" ? "is-active" : ""}
                onClick={() => setSelectedCategory("all")}
              >
                All produce
              </button>
              {["vegetables", "fruits", "grains", "pulses"].map((key) => (
                <button
                  key={key}
                  className={selectedCategory === key ? "is-active" : ""}
                  onClick={() => setSelectedCategory(key)}
                >
                  {key[0].toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>

            <label className="market-search">
              <span>⌕</span>
              <input
                type="search"
                placeholder="Search crop, category, or location..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="product-section market-product-section">
          <div className="section-heading">
            <h2>Available produce</h2>
            <span>{filteredProducts.length} fresh listing{filteredProducts.length === 1 ? "" : "s"}</span>
          </div>

          {search && (
            <div className="active-search-indicator">
              <span>Showing {filteredProducts.length} result{filteredProducts.length === 1 ? "" : "s"} for "<strong>{search}</strong>"</span>
              <button type="button" onClick={() => setSearch("")}>✕ Clear search</button>
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <div className="empty-product">
              <div>🧺</div>
              <h3>No products found {search ? `matching "${search}"` : ""}</h3>
              <p>Try another search keyword or check again later.</p>
              {search && (
                <button
                  type="button"
                  className="farmer-btn"
                  style={{ marginTop: "12px", display: "inline-block" }}
                  onClick={() => { setSearch(""); setSelectedCategory("all"); }}
                >
                  Clear search & show all produce
                </button>
              )}
            </div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product) => {
                const itemQty = Number(quantity[product.id] || 1);
                const pricing = getTierPricing(product, itemQty);
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

                    <p className="muted-text">Grown by {product.ownerName} · {product.location}</p>

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
                      Available stock after this order: {availableStockAfterOrder(product).toLocaleString("en-IN", { maximumFractionDigits: 2 })} {product.unit}
                    </p>

                    <button
                      className="register-btn full-width"
                      onClick={() =>
                        navigate("/checkout", {
                          state: {
                            product,
                            quantity: Number(quantity[product.id] || 1),
                          },
                        })
                      }
                    >
                      Buy Now {pricing.isDiscounted ? `(₹${pricing.total.toFixed(2)})` : ""}
                    </button>
                    <button className="login-btn full-width cart-button" onClick={() => addToCart(product)}>Add to Cart</button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default BusinessDashboard;
