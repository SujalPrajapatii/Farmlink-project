import { api } from "../api";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CancellationModal from "../components/CancellationModal";
import { CATEGORY_IMAGES, getCategoryKey, getProductImage, handleImageError } from "../productImages";

function hasSuccessfulOnlinePayment(order) {
  const paymentStatus = String(order.paymentStatus || "").toUpperCase();
  return order.paymentMethod === "ONLINE" && ["PAID", "SUCCESS"].includes(paymentStatus);
}

function BusinessDashboard() {
  const navigate = useNavigate();

  const currentUser = JSON.parse(
    localStorage.getItem("farmlinkCurrentUser") || "null"
  );

  const accountType = currentUser?.accountType;

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderSummary, setOrderSummary] = useState({
    totalOrders: 0,
    completedOrders: 0,
    completedTotal: 0,
  });
  const [search, setSearch] = useState("");
  const [quantity, setQuantity] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("farmlinkCart") || "[]"));
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  function updateCart(nextCart) {
    setCart(nextCart);
    localStorage.setItem("farmlinkCart", JSON.stringify(nextCart));
  }

  function addToCart(product) {
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
    if (accountType !== "business") return;

    let active = true;
    let firstLoad = true;

    async function loadDashboardData() {
      try {
        const [productsData, ordersData, summaryData, notificationsData] = await Promise.all([
          api("/products"),
          api("/orders/mine"),
          api("/orders/summary"),
          api("/orders/notifications"),
        ]);

        if (!active) return;
        setProducts(productsData);
        setOrders(ordersData);
        setOrderSummary(summaryData);
        setNotifications(notificationsData);
      } catch (error) {
        // Do not repeatedly interrupt a buyer when a background refresh has a
        // temporary network problem. The first load still explains the error.
        if (firstLoad && active) alert(error.message);
      } finally {
        firstLoad = false;
      }
    }

    loadDashboardData();
    window.addEventListener("focus", loadDashboardData);
    // A farmer cancellation removes the order from this list. Refresh often
    // enough that its notification appears promptly in the buyer dashboard.
    const refreshId = window.setInterval(loadDashboardData, 5000);

    return () => {
      active = false;
      window.removeEventListener("focus", loadDashboardData);
      window.clearInterval(refreshId);
    };
  }, [accountType]);

  if (!currentUser || accountType !== "business") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Access denied</h1>
          <p>Please log in as a business buyer to continue.</p>

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

  // const completedOrders = orders.filter((order) => order.status === "Delivered");
  // const totalSpent = completedOrders.reduce((total, order) => total + Number(order.total), 0);

  function availableStockAfterOrder(product) {
    const stock = Number(product.quantity) || 0;
    const requestedQuantity = Number(quantity[product.id] || 1);

    return Math.max(stock - (Number.isFinite(requestedQuantity) ? requestedQuantity : 0), 0);
  }

 /* async function loadProducts() {
    try {
      const data = await api("/products");
      setProducts(data);
    } catch (error) {
      alert(error.message);
    }
  }

  async function loadOrders() {
    try {
      const data = await api("/orders/mine");
      setOrders(data);
    } catch (error) {
      alert(error.message);
    }
  }*/

  function handleLogout() {
    localStorage.removeItem("farmlinkToken");
    localStorage.removeItem("farmlinkCurrentUser");
    navigate("/");
  }

  async function cancelOrder({ reason, customReason }) {
    try {
      setIsCancelling(true);
      const result = await api(`/orders/${cancellingOrderId}/cancel`, { method: "POST", body: JSON.stringify({ reason, customReason }) });
      setOrders((currentOrders) =>
        currentOrders.filter((order) => order.id !== cancellingOrderId)
      );
      alert(result.message);
      setCancellingOrderId(null);
      const productsData = await api("/products");
      setProducts(productsData);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsCancelling(false);
    }
  }

 /*async function placeOrder(product) {
    const orderQuantity = Number(quantity[product.id] || 1);

    if (
      !Number.isInteger(orderQuantity) ||
      orderQuantity < 1 ||
      orderQuantity > Number(product.quantity)
    ) {
      alert(`Enter a whole quantity between 1 and ${product.quantity}.`);
      return;
    }

    try {
      await api("/orders", {
        method: "POST",
        body: JSON.stringify({
          productId: product.id,
          quantity: orderQuantity,
        }),
      });

      alert("Order placed successfully!");
      await Promise.all([loadProducts(), loadOrders()]);
    } catch (error) {
      alert(error.message);
    }
  }*/

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <h2>🌱 FarmLink</h2>
        <Link to="/">Home</Link>
        <Link to="/business-dashboard">Marketplace</Link>
        <a href="#products">Available Products</a>
        <a href="#orders">My Orders</a>
        <button className="sidebar-cart" onClick={() => navigate("/checkout", { state: { cart } })}>Cart ({cart.length})</button>
        <button className="sidebar-cart" onClick={() => setNotificationsOpen((isOpen) => !isOpen)}>
          Notifications{unreadNotificationCount ? ` (${unreadNotificationCount})` : ""}
        </button>

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


        <section className="market-order-stats" aria-label="Order summary"><article><span>Total orders</span><strong>{orderSummary.totalOrders}</strong><small>Orders placed</small></article><article><span>Completed</span><strong>{orderSummary.completedOrders}</strong><small>Delivered successfully</small></article><article><span>Total spent</span><strong>₹{orderSummary.completedTotal.toLocaleString("en-IN")}</strong><small>Delivered orders only</small></article></section>

        <section className="market-intro" id="products">
          <div>
            <p className="section-tag">EXPLORE CATEGORIES</p>
            <h2>Fresh picks for your business.</h2>
            <p>Welcome back, {currentUser.name}. Explore farm produce by category or search below.</p>
          </div>
          
          <div className="category-grid market-category-cards" style={{ margin: "20px 0 25px" }}>
            {[
              { key: "vegetables", name: "Vegetables", image: CATEGORY_IMAGES.vegetables },
              { key: "fruits", name: "Fruits", image: CATEGORY_IMAGES.fruits },
              { key: "grains", name: "Grains", image: CATEGORY_IMAGES.grains },
              { key: "pulses", name: "Pulses", image: CATEGORY_IMAGES.pulses },
            ].map((cat) => (
              <div
                key={cat.key}
                className={`category-card ${selectedCategory === cat.key ? "is-selected-card" : ""}`}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedCategory(selectedCategory === cat.key ? "all" : cat.key)}
              >
                <img src={cat.image} alt={cat.name} onError={(e) => handleImageError(e, cat.key)} />
                <span>
                  {cat.name}
                  <small>{selectedCategory === cat.key ? "✓ Filtered (Click to reset)" : "Explore produce →"}</small>
                </span>
              </div>
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
        </section>

        <section className="product-section market-product-section">
          <div className="section-heading"><h2>Available produce</h2><span>{filteredProducts.length} fresh listing{filteredProducts.length === 1 ? "" : "s"}</span></div>

          {filteredProducts.length === 0 ? (
            <div className="empty-product">
              <div>🧺</div>
              <h3>No products found</h3>
              <p>Try another search or check again later.</p>
            </div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <article className="product-card market-product-card" key={product.id}>
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    onError={(event) => handleImageError(event, product.category, product.name)}
                  />
                  <span className="market-product-category">{product.category}</span>
                  <h3>{product.name}</h3>
                  <strong>
                    ₹{product.price} / {product.unit}
                  </strong>
                  <p className="muted-text">Grown by {product.ownerName} · {product.location}</p>

                  <label className="quantity-label">Order Quantity</label>
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
  Buy Now
</button>
<button className="login-btn full-width cart-button" onClick={() => addToCart(product)}>Add to Cart</button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="product-section market-orders" id="orders">
          <h2>My Orders</h2>

          {orders.length === 0 ? (
            <p className="muted-text">You have not placed any orders yet.</p>
          ) : (
            <div className="order-list">
              {orders.map((order) => (
                <article className="order-card" key={order.id}>
                  <img
                    className="order-product-image"
                    src={getProductImage(order.productCategory, order.productName)}
                    alt={order.productCategory || "Produce"}
                    onError={(event) => handleImageError(event, order.productCategory, order.productName)}
                  />
                  <div className="order-product-details">
                    <h3>{order.productName}</h3>
                    <p>
                      Farmer: {order.farmerName} · Quantity: {order.quantity}
                    </p>
                    <p>
                      Order Date:{" "}
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="order-right">
                    <strong>₹{order.total}</strong>
                    <span
                      className={`status status-${order.status.toLowerCase().replaceAll(" ", "-")}`}
                    >
                      {order.status}
                    </span>
                    <Link
                      className="login-btn"
                      to={`/orders/${order.id}/tracking`}
                    >
                      Track Order
                    </Link>
                    {hasSuccessfulOnlinePayment(order) ? (
                      <p className="paid-order-cancellation-notice">This order has been paid online and cannot be cancelled.</p>
                    ) : ["Awaiting Payment", "Pending", "Accepted"].includes(order.status) && (
                      <button className="cancel-btn" onClick={() => setCancellingOrderId(order.id)}>Cancel Order</button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      {cancellingOrderId && <CancellationModal role="buyer" orderId={cancellingOrderId} onClose={() => setCancellingOrderId(null)} onConfirm={cancelOrder} submitting={isCancelling} />}
    </div>
  );
}

export default BusinessDashboard;
