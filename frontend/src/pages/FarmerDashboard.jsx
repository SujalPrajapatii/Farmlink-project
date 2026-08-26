import { api } from "../api";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CancellationModal from "../components/CancellationModal";

const categoryImages = {
  vegetables: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1000&q=85",
  fruits: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1000&q=85",
  grains: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1000&q=85",
  pulses: "/pulses.svg",
};

function categoryImage(category) {
  const value = String(category || "").toLowerCase();
  const key = Object.keys(categoryImages).find((item) => value.includes(item.slice(0, -1)));
  return categoryImages[key || "vegetables"];
}

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
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const locationWatchRef = useRef(null);
  const lastLocationSentRef = useRef(0);

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
        setProducts(productsData);
        setOrders(ordersData);
        setNotifications(notificationsData);
      } catch (error) {
        if (firstLoad && active) alert(error.message);
      } finally {
        firstLoad = false;
      }
    }

    loadDashboardData();
    window.addEventListener("focus", loadDashboardData);
    // Poll frequently enough for a buyer cancellation to appear promptly while
    // still using the existing authenticated dashboard API.
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
  const unreadNotificationCount = notifications.filter((notification) => !Boolean(notification.isRead)).length;

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

  async function updateOrderStatus(orderId, status) {
    try {
      await api(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      if (status === "Delivered") stopLiveTracking();

      alert("Order updated successfully.");
      await Promise.all([loadOrders(), loadProducts()]);
      return true;
    } catch (error) {
      alert(error.message);
      return false;
    }
  }

  function stopLiveTracking() {
    if (locationWatchRef.current !== null) {
      navigator.geolocation?.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
    }
    lastLocationSentRef.current = 0;
  }

  async function sendDeliveryLocation(orderId, position, showConfirmation = false) {
    await api(`/orders/${orderId}/location`, {
      method: "POST",
      body: JSON.stringify({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        note: "Farmer is currently delivering your order.",
      }),
    });

    if (showConfirmation) alert("Your current delivery location was shared with the buyer.");
  }

  function startLiveTracking(orderId) {
    if (!navigator.geolocation) {
      alert("Your browser does not support live location sharing.");
      return;
    }

    stopLiveTracking();
    lastLocationSentRef.current = 0;
    locationWatchRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        // Save the initial position immediately, then refresh it at most once
        // every 25 seconds while the farmer travels.
        if (Date.now() - lastLocationSentRef.current < 25000) return;
        lastLocationSentRef.current = Date.now();
        try {
          await sendDeliveryLocation(orderId, position);
        } catch (error) {
          console.error("Could not update live delivery location:", error);
        }
      },
      () => alert("Allow location permission to automatically share the delivery route with the buyer."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  async function startDelivery(orderId) {
    const started = await updateOrderStatus(orderId, "Out for Delivery");
    if (started) startLiveTracking(orderId);
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
      await loadProducts();
    } catch (error) {
      alert(error.message);
    } finally {
      setIsCancelling(false);
    }
  }

  async function shareCurrentLocation(orderId) {
  if (!navigator.geolocation) {
    alert("Your browser does not support location sharing.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        await sendDeliveryLocation(orderId, position, true);
      } catch (error) {
        alert(error.message);
      }
    },
    () => {
      alert(
        "Location permission was denied. Please allow location access and try again."
      );
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    }
  );
}

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <h2>🌱 FarmLink</h2>
        <Link to="/farmer-dashboard">Dashboard</Link>
        <a href="#products">My Products</a>
        <a href="#orders">Orders</a>

        <button className="sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <p className="section-tag">FARMER DASHBOARD</p>
            <h1>Welcome, {currentUser.name}!</h1>
            <p>Manage your product listings and buyer orders.</p>
          </div>

          <div className="dashboard-header-actions">
            <button
              className="notification-button"
              type="button"
              onClick={() => setNotificationsOpen((isOpen) => !isOpen)}
              aria-expanded={notificationsOpen}
              aria-controls="farmer-notifications"
            >
              <span aria-hidden="true">🔔</span>
              <span className="sr-only">Notifications</span>
              {unreadNotificationCount > 0 && <span className="notification-badge">{unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}</span>}
            </button>
            <Link className="register-btn" to="/add-product">
              + Add Product
            </Link>
          </div>
        </div>

        <section className="dashboard-stats farmer-stats">
          <div className="dashboard-stat-card">
            <p>Total Orders</p>
            <h2>{orders.length}</h2>
          </div>
          <div className="dashboard-stat-card">
            <p>Active Products</p>
            <h2>{products.length}</h2>
          </div>

          <div className="dashboard-stat-card">
            <p>Orders to Ship</p>
            <h2>{ordersToShip.length}</h2>
          </div>

          <div className="dashboard-stat-card">
            <p>Completed Orders</p>
            <h2>{completedOrders.length}</h2>
          </div>

          <div className="dashboard-stat-card">
            <p>Total Income</p>
            <h2>₹{totalSales}</h2>
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
                    src={categoryImage(product.category)}
                    alt={product.name}
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

        <section className="product-section" id="orders">
          <h2>Orders Received</h2>

          {orders.length === 0 ? (
            <p className="muted-text">You have not received any orders yet.</p>
          ) : (
            <div className="order-list">
              {orders.map((order) => (
                <article className="order-card" key={order.id}>
                  <img
                    className="order-product-image"
                    src={categoryImage(order.productCategory)}
                    alt={order.productCategory || "Produce"}
                  />
                  <div className="order-product-details">
                    <h3>{order.productName}</h3>
                    <p>
                      Buyer: {order.businessName} · Quantity: {order.quantity}
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
                      View Tracking
                    </Link>

                    {order.status === "Pending" && (
                      <div className="order-actions">
                        <button
                          className="cancel-btn"
                          onClick={() => setCancellingOrderId(order.id)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                   {order.status === "Accepted" && (
  <div className="order-actions"><button className="accept-btn" onClick={() => startDelivery(order.id)}>Start Delivery</button><button className="cancel-btn" onClick={() => setCancellingOrderId(order.id)}>Cancel Order</button></div>
)}

{order.status === "Out for Delivery" && (
  <div className="order-actions">
    <button
      className="accept-btn"
      onClick={() => shareCurrentLocation(order.id)}
    >
      Update Location Now
    </button>

    <button
      className="deliver-btn"
      onClick={() =>
        updateOrderStatus(order.id, "Delivered")
      }
    >
      Mark Delivered
    </button>
  </div>
)}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      {cancellingOrderId && <CancellationModal role="seller" orderId={cancellingOrderId} onClose={() => setCancellingOrderId(null)} onConfirm={cancelOrder} submitting={isCancelling} />}
    </div>
  );
}

export default FarmerDashboard;
