import { api } from "../api";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProductImage, handleImageError } from "../productImages";

function FarmerDashboard() {
  const navigate = useNavigate();

  const currentUser = JSON.parse(
    localStorage.getItem("farmlinkCurrentUser") || "null"
  );

  const accountType = currentUser?.accountType;

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    if (accountType !== "farmer") return;

    let active = true;
    let firstLoad = true;

    async function loadDashboardData() {
      try {
        const [productsData, ordersData, notificationsData] = await Promise.all([
          api("/products/mine"),
          api("/orders/mine"),
          api("/orders/notifications"),
        ]);

        if (!active) return;
        setProducts(productsData || []);
        setOrders(ordersData || []);
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
  }, [accountType]);

  if (!currentUser || accountType !== "farmer") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Access denied</h1>
          <p>Please log in as a farmer to continue.</p>

          <Link className="farmer-btn" to="/login">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const ordersToShip = orders.filter(
    (order) => order.status === "Accepted"
  );

  const completedOrders = orders.filter(
    (order) => order.status === "Delivered"
  );

  const totalSales = completedOrders.reduce(
    (total, order) => total + Number(order.total),
    0
  );
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

  async function loadProducts() {
    try {
      const data = await api("/products/mine");
      setProducts(data || []);
    } catch (error) {
      alert(error.message);
    }
  }

  function handleLogout() {
    localStorage.removeItem("farmlinkToken");
    localStorage.removeItem("farmlinkCurrentUser");
    navigate("/");
  }

  async function deleteProduct(productId) {
    const confirmed = window.confirm(
      "Do you want to delete this product?"
    );

    if (!confirmed) return;

    try {
      await api(`/products/${productId}`, {
        method: "DELETE",
      });

      alert("Product deleted successfully.");
      await loadProducts();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <h2>🌱 FarmLink</h2>
        <Link to="/" className="sidebar-nav-item">🏠 Home</Link>
        <Link to="/farmer-dashboard" className="sidebar-nav-item is-active">🌾 My Products</Link>
        <Link to="/farmer-orders" className="sidebar-nav-item">
          📦 Orders Received {orders.length > 0 && <span className="nav-count-badge">{orders.length}</span>}
        </Link>
        <Link to="/add-product" className="sidebar-nav-item">➕ Add Product</Link>
        <Link to="/farmer-notifications" className="sidebar-nav-item">
          🔔 Notifications {unreadNotificationCount > 0 && <span className="nav-count-badge alert">{unreadNotificationCount}</span>}
        </Link>

        <button className="sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <p className="section-tag">FARMER DASHBOARD</p>
            <h1>Welcome, {currentUser.name}!</h1>
            <p>Manage your product listings and view your buyer orders.</p>
          </div>

          <div className="dashboard-header-actions">
            <Link className="farmer-btn" to="/farmer-orders" style={{ textDecoration: "none" }}>
              📦 View Orders ({orders.length})
            </Link>
            <Link className="register-btn" to="/add-product">
              + Add Product
            </Link>
          </div>
        </div>

        <section className="dashboard-stats farmer-stats">
          <Link to="/farmer-orders" className="dashboard-stat-card" style={{ textDecoration: "none" }}>
            <p>Total Orders</p>
            <h2>{orders.length}</h2>
          </Link>
          <div className="dashboard-stat-card">
            <p>Active Products</p>
            <h2>{products.length}</h2>
          </div>

          <Link to="/farmer-orders" className="dashboard-stat-card" style={{ textDecoration: "none" }}>
            <p>Orders to Ship</p>
            <h2>{ordersToShip.length}</h2>
          </Link>

          <Link to="/farmer-orders" className="dashboard-stat-card" style={{ textDecoration: "none" }}>
            <p>Completed Orders</p>
            <h2>{completedOrders.length}</h2>
          </Link>

          <div className="dashboard-stat-card">
            <p>Total Income</p>
            <h2>₹{totalSales.toLocaleString("en-IN")}</h2>
          </div>
        </section>

        {notificationsOpen && (
          <section className="product-section order-notifications" id="farmer-notifications" aria-live="polite">
            <h2>Order Notifications</h2>
            {notifications.length === 0 ? (
              <p className="muted-text">You have no notifications.</p>
            ) : (
              <div className="notification-list">
                {notifications.map((notification) => (
                  <button
                    className={`order-notification ${notification.isRead ? "is-read" : "is-unread"}`}
                    key={notification.id}
                    type="button"
                    onClick={() => openNotification(notification)}
                  >
                    <strong>{notification.title || "Order Cancelled"}</strong>
                    <span>{notification.message}</span>
                    <time dateTime={notification.createdAt}>
                      {new Date(notification.createdAt).toLocaleString()}
                    </time>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="product-section" id="products">
          <div className="section-heading">
            <h2>My Product Listings</h2>
            <Link className="login-btn" to="/add-product">
              Add New
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="empty-product">
              <div>📦</div>
              <h3>No products added yet</h3>
              <p>Add your first crop product so businesses can find it.</p>

              <Link className="register-btn" to="/add-product">
                + Add Your First Product
              </Link>
            </div>
          ) : (
            <div className="product-grid">
              {products.map((product) => (
                <article className="product-card farmer-product-card" key={product.id}>
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    onError={(event) => handleImageError(event, product.category, product.name)}
                  />

                  <h3>{product.name}</h3>
                  <p>{product.category}</p>
                  <p>
                    Available: {product.quantity} {product.unit}
                  </p>
                  <strong>
                    ₹{product.price} / {product.unit}
                  </strong>
                  <p>{product.location}</p>

                  <div className="product-actions">
                    <Link
                      className="edit-btn"
                      to={`/edit-product/${product.id}`}
                    >
                      Edit
                    </Link>

                    <button
                      className="delete-btn"
                      onClick={() => deleteProduct(product.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default FarmerDashboard;
