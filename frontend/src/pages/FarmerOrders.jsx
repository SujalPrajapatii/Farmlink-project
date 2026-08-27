import { api } from "../api";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CancellationModal from "../components/CancellationModal";
import DeliveryOtpModal from "../components/DeliveryOtpModal";
import { getProductImage, handleImageError } from "../productImages";

function hasSuccessfulOnlinePayment(order) {
  const paymentStatus = String(order.paymentStatus || "").toUpperCase();
  return order.paymentMethod === "ONLINE" && ["PAID", "SUCCESS"].includes(paymentStatus);
}

function FarmerOrders() {
  const navigate = useNavigate();

  const currentUser = JSON.parse(
    localStorage.getItem("farmlinkCurrentUser") || "null"
  );

  const accountType = currentUser?.accountType;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [deliveringOrder, setDeliveringOrder] = useState(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const locationWatchRef = useRef(null);
  const lastLocationSentRef = useRef(0);

  useEffect(() => {
    if (accountType !== "farmer") return;

    let active = true;
    let firstLoad = true;

    async function loadOrdersData() {
      try {
        if (firstLoad) setLoading(true);
        const [ordersData, notificationsData] = await Promise.all([
          api("/orders/mine"),
          api("/orders/notifications"),
        ]);

        if (!active) return;
        setOrders(ordersData || []);
        setNotifications(notificationsData || []);
      } catch (error) {
        if (firstLoad && active) alert(error.message);
      } finally {
        if (active) setLoading(false);
        firstLoad = false;
      }
    }

    loadOrdersData();
    window.addEventListener("focus", loadOrdersData);
    const refreshId = window.setInterval(loadOrdersData, 5000);

    return () => {
      active = false;
      window.removeEventListener("focus", loadOrdersData);
      window.clearInterval(refreshId);
    };
  }, [accountType]);

  if (!currentUser || accountType !== "farmer") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Access denied</h1>
          <p>Please log in as a farmer to view received orders.</p>
          <Link className="farmer-btn" to="/login">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const ordersToShip = orders.filter((order) => order.status === "Accepted");
  const pendingOrders = orders.filter((order) => order.status === "Pending");
  const completedOrders = orders.filter((order) => order.status === "Delivered");
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

  async function loadOrders() {
    try {
      const data = await api("/orders/mine");
      setOrders(data || []);
    } catch (error) {
      alert(error.message);
    }
  }

  function handleLogout() {
    localStorage.removeItem("farmlinkToken");
    localStorage.removeItem("farmlinkCurrentUser");
    navigate("/");
  }

  async function updateOrderStatus(orderId, status, otp = null) {
    try {
      const body = { status };
      if (otp) body.otp = otp;
      await api(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      if (status === "Delivered") stopLiveTracking();

      alert("Order updated successfully.");
      await loadOrders();
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

  async function handleVerifyDeliveryOtp(otp) {
    if (!deliveringOrder) return;
    setIsVerifyingOtp(true);
    try {
      await api(`/orders/${deliveringOrder.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Delivered", otp }),
      });
      stopLiveTracking();
      alert("Order marked as delivered successfully!");
      setDeliveringOrder(null);
      await loadOrders();
    } catch (error) {
      throw error;
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  async function cancelOrder({ reason, customReason }) {
    try {
      setIsCancelling(true);
      const result = await api(`/orders/${cancellingOrderId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason, customReason }),
      });
      setOrders((currentOrders) =>
        currentOrders.filter((order) => order.id !== cancellingOrderId)
      );
      alert(result.message);
      setCancellingOrderId(null);
      await loadOrders();
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
        alert("Location permission was denied. Please allow location access and try again.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "pending") return order.status === "Pending";
    if (statusFilter === "accepted") return order.status === "Accepted";
    if (statusFilter === "shipping") return order.status === "Out for Delivery";
    if (statusFilter === "delivered") return order.status === "Delivered";
    if (statusFilter === "cancelled") return ["Cancelled", "CANCELLED_BY_BUYER"].includes(order.status);
    return true;
  });

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <h2>🌱 FarmLink</h2>
        <Link to="/">Home</Link>
        <Link to="/farmer-dashboard">My Products</Link>
        <Link to="/farmer-orders" style={{ background: "rgba(255,255,255,0.22)", color: "#fff", fontWeight: "800" }}>
          Orders Received {orders.length > 0 && `(${orders.length})`}
        </Link>
        <Link to="/add-product" className="register-btn" style={{ padding: "8px 14px", textDecoration: "none" }}>
          + Add Product
        </Link>
        <button className="sidebar-cart" onClick={() => setNotificationsOpen((isOpen) => !isOpen)}>
          🔔 Notifications{unreadNotificationCount ? ` (${unreadNotificationCount})` : ""}
        </button>
        <button className="sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header" style={{ marginBottom: "28px" }}>
          <div>
            <p className="section-tag">FARMER ORDERS MANAGEMENT</p>
            <h1>Orders Received</h1>
            <p>Review incoming orders from business buyers, dispatch harvests, and share live location.</p>
          </div>

          <div className="dashboard-header-actions">
            <Link className="register-btn" to="/add-product">
              + Add Product
            </Link>
          </div>
        </div>

        <section className="dashboard-stats farmer-stats" style={{ marginBottom: "30px" }}>
          <div className="dashboard-stat-card">
            <p>Total Orders</p>
            <h2>{orders.length}</h2>
          </div>
          <div className="dashboard-stat-card">
            <p>Pending</p>
            <h2>{pendingOrders.length}</h2>
          </div>
          <div className="dashboard-stat-card">
            <p>Orders to Ship</p>
            <h2>{ordersToShip.length}</h2>
          </div>
          <div className="dashboard-stat-card">
            <p>Completed</p>
            <h2>{completedOrders.length}</h2>
          </div>
          <div className="dashboard-stat-card">
            <p>Total Income</p>
            <h2>₹{totalSales.toLocaleString("en-IN")}</h2>
          </div>
        </section>

        {notificationsOpen && (
          <section className="product-section order-notifications" aria-live="polite" style={{ marginBottom: "25px" }}>
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

        <section className="product-section">
          <div className="section-heading" style={{ marginBottom: "20px" }}>
            <h2>All Received Orders</h2>
            <div className="market-category-pills" style={{ margin: 0 }}>
              <button
                className={statusFilter === "all" ? "is-active" : ""}
                onClick={() => setStatusFilter("all")}
              >
                All ({orders.length})
              </button>
              <button
                className={statusFilter === "pending" ? "is-active" : ""}
                onClick={() => setStatusFilter("pending")}
              >
                Pending ({pendingOrders.length})
              </button>
              <button
                className={statusFilter === "accepted" ? "is-active" : ""}
                onClick={() => setStatusFilter("accepted")}
              >
                To Ship ({ordersToShip.length})
              </button>
              <button
                className={statusFilter === "shipping" ? "is-active" : ""}
                onClick={() => setStatusFilter("shipping")}
              >
                On Delivery
              </button>
              <button
                className={statusFilter === "delivered" ? "is-active" : ""}
                onClick={() => setStatusFilter("delivered")}
              >
                Delivered ({completedOrders.length})
              </button>
            </div>
          </div>

          {loading ? (
            <p className="muted-text">Loading orders...</p>
          ) : filteredOrders.length === 0 ? (
            <div className="empty-product">
              <div>📦</div>
              <h3>No orders found</h3>
              <p>{statusFilter === "all" ? "You have not received any orders yet." : "No orders matching this status filter."}</p>
              <Link className="farmer-btn" to="/farmer-dashboard" style={{ marginTop: "14px", display: "inline-block" }}>
                Back to My Products
              </Link>
            </div>
          ) : (
            <div className="order-list">
              {filteredOrders.map((order) => (
                <article className="order-card" key={order.id}>
                  <img
                    className="order-product-image"
                    src={getProductImage(order.productCategory, order.productName)}
                    alt={order.productName || "Produce"}
                    onError={(event) => handleImageError(event, order.productCategory, order.productName)}
                  />
                  <div className="order-product-details">
                    <h3>{order.productName}</h3>
                    <p>
                      <strong>Buyer:</strong> {order.businessName} · <strong>Quantity:</strong> {order.quantity}
                    </p>
                    <p>
                      <strong>Payment:</strong> {order.paymentMethod} ({order.paymentStatus || "PENDING"})
                    </p>
                    <p className="muted-text">
                      Order Date: {new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })}
                    </p>
                  </div>

                  <div className="order-right">
                    <strong>₹{Number(order.total).toLocaleString("en-IN")}</strong>
                    <span className={`status status-${String(order.status).toLowerCase().replaceAll(" ", "-")}`}>
                      {order.status}
                    </span>

                    <Link className="login-btn" to={`/orders/${order.id}/tracking`}>
                      View Tracking →
                    </Link>

                    {hasSuccessfulOnlinePayment(order) ? (
                      <p className="paid-order-cancellation-notice">Paid online (non-cancellable)</p>
                    ) : order.status === "Pending" && (
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
                      <div className="order-actions">
                        <button className="accept-btn" onClick={() => startDelivery(order.id)}>
                          Start Delivery
                        </button>
                        {!hasSuccessfulOnlinePayment(order) && (
                          <button className="cancel-btn" onClick={() => setCancellingOrderId(order.id)}>
                            Cancel Order
                          </button>
                        )}
                      </div>
                    )}

                    {order.status === "Out for Delivery" && (
                      <div className="order-actions">
                        <button className="accept-btn" onClick={() => shareCurrentLocation(order.id)}>
                          Update Location Now
                        </button>
                        <button
                          className="deliver-btn"
                          onClick={() => setDeliveringOrder(order)}
                        >
                          🔐 Mark Delivered
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

      {deliveringOrder && (
        <DeliveryOtpModal
          order={deliveringOrder}
          onClose={() => setDeliveringOrder(null)}
          onConfirm={handleVerifyDeliveryOtp}
          submitting={isVerifyingOtp}
        />
      )}

      {cancellingOrderId && (
        <CancellationModal
          role="seller"
          orderId={cancellingOrderId}
          onClose={() => setCancellingOrderId(null)}
          onConfirm={cancelOrder}
          submitting={isCancelling}
        />
      )}
    </div>
  );
}

export default FarmerOrders;
