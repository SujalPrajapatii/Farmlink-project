import { api } from "../api";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CancellationModal from "../components/CancellationModal";
import { getProductImage, handleImageError } from "../productImages";

function hasSuccessfulOnlinePayment(order) {
  const paymentStatus = String(order.paymentStatus || "").toUpperCase();
  return order.paymentMethod === "ONLINE" && ["PAID", "SUCCESS"].includes(paymentStatus);
}

function BuyerOrders() {
  const navigate = useNavigate();

  const currentUser = JSON.parse(
    localStorage.getItem("farmlinkCurrentUser") || "null"
  );

  const accountType = currentUser?.accountType;

  const [orders, setOrders] = useState([]);
  const [orderSummary, setOrderSummary] = useState({
    totalOrders: 0,
    completedOrders: 0,
    completedTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [cart] = useState(() => JSON.parse(localStorage.getItem("farmlinkCart") || "[]"));
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (accountType !== "business") return;

    let active = true;
    let firstLoad = true;

    async function loadOrdersData() {
      try {
        if (firstLoad) setLoading(true);
        const [ordersData, summaryData, notificationsData] = await Promise.all([
          api("/orders/mine"),
          api("/orders/summary"),
          api("/orders/notifications"),
        ]);

        if (!active) return;
        setOrders(ordersData || []);
        setOrderSummary(summaryData || { totalOrders: 0, completedOrders: 0, completedTotal: 0 });
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

  if (!currentUser || accountType !== "business") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Access denied</h1>
          <p>Please log in as a business buyer to view your orders.</p>
          <Link className="farmer-btn" to="/login">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

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

  function handleLogout() {
    localStorage.removeItem("farmlinkToken");
    localStorage.removeItem("farmlinkCurrentUser");
    navigate("/");
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
      const [updatedOrders, summaryData] = await Promise.all([
        api("/orders/mine"),
        api("/orders/summary"),
      ]);
      setOrders(updatedOrders || []);
      setOrderSummary(summaryData || { totalOrders: 0, completedOrders: 0, completedTotal: 0 });
    } catch (error) {
      alert(error.message);
    } finally {
      setIsCancelling(false);
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return ["Pending", "Accepted", "Out for Delivery", "Awaiting Payment"].includes(order.status);
    if (statusFilter === "delivered") return order.status === "Delivered";
    if (statusFilter === "cancelled") return ["Cancelled", "CANCELLED_BY_BUYER"].includes(order.status);
    return true;
  });

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <h2>🌱 FarmLink</h2>
        <Link to="/">Home</Link>
        <Link to="/business-dashboard">Marketplace</Link>
        <Link to="/my-orders" style={{ background: "rgba(255,255,255,0.22)", color: "#fff", fontWeight: "800" }}>
          My Orders {orders.length > 0 && `(${orders.length})`}
        </Link>
        <button className="sidebar-cart" onClick={() => navigate("/checkout", { state: { cart } })}>
          🛒 Cart ({cart.length})
        </button>
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
            <p className="section-tag">BUYER ORDERS</p>
            <h1>My Orders</h1>
            <p>Track your active farm purchases, view delivery details, and order history.</p>
          </div>
          <Link className="register-btn" to="/business-dashboard">
            + Order More Produce
          </Link>
        </div>

        <section className="market-order-stats" aria-label="Order summary" style={{ marginBottom: "30px" }}>
          <article>
            <span>Total orders</span>
            <strong>{orderSummary.totalOrders}</strong>
            <small>Orders placed</small>
          </article>
          <article>
            <span>Completed</span>
            <strong>{orderSummary.completedOrders}</strong>
            <small>Delivered successfully</small>
          </article>
          <article>
            <span>Total spent</span>
            <strong>₹{orderSummary.completedTotal.toLocaleString("en-IN")}</strong>
            <small>Delivered orders only</small>
          </article>
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
                    <strong>{notification.title || "Order Update"}</strong>
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
            <h2>Order History & Tracking</h2>
            <div className="market-category-pills" style={{ margin: 0 }}>
              <button
                className={statusFilter === "all" ? "is-active" : ""}
                onClick={() => setStatusFilter("all")}
              >
                All ({orders.length})
              </button>
              <button
                className={statusFilter === "active" ? "is-active" : ""}
                onClick={() => setStatusFilter("active")}
              >
                Active
              </button>
              <button
                className={statusFilter === "delivered" ? "is-active" : ""}
                onClick={() => setStatusFilter("delivered")}
              >
                Delivered
              </button>
              <button
                className={statusFilter === "cancelled" ? "is-active" : ""}
                onClick={() => setStatusFilter("cancelled")}
              >
                Cancelled
              </button>
            </div>
          </div>

          {loading ? (
            <p className="muted-text">Loading your orders...</p>
          ) : filteredOrders.length === 0 ? (
            <div className="empty-product">
              <div>🧺</div>
              <h3>No orders found</h3>
              <p>{statusFilter === "all" ? "You have not placed any orders yet." : "No orders matching this status."}</p>
              <Link className="register-btn" to="/business-dashboard" style={{ marginTop: "14px", display: "inline-block" }}>
                Browse Marketplace
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
                      <strong>Farmer:</strong> {order.farmerName} · <strong>Quantity:</strong> {order.quantity}
                    </p>
                    <p>
                      <strong>Payment:</strong> {order.paymentMethod} ({order.paymentStatus || "PENDING"})
                    </p>
                    <p className="muted-text">
                      Ordered on {new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })}
                    </p>
                    {order.status === "Out for Delivery" && order.deliveryOtp && (
                      <div className="buyer-order-otp-pill" title="Share this OTP with farmer on delivery">
                        <span className="otp-pill-icon">🔐</span>
                        <span>Delivery OTP:</span>
                        <strong>{order.deliveryOtp}</strong>
                      </div>
                    )}
                  </div>

                  <div className="order-right">
                    <strong>₹{Number(order.total).toLocaleString("en-IN")}</strong>
                    <span className={`status status-${String(order.status).toLowerCase().replaceAll(" ", "-")}`}>
                      {order.status}
                    </span>
                    <Link className="login-btn" to={`/orders/${order.id}/tracking`}>
                      Track Order →
                    </Link>
                    {hasSuccessfulOnlinePayment(order) ? (
                      <p className="paid-order-cancellation-notice">Paid online (non-cancellable)</p>
                    ) : ["Awaiting Payment", "Pending", "Accepted"].includes(order.status) && (
                      <button className="cancel-btn" onClick={() => setCancellingOrderId(order.id)}>
                        Cancel Order
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {cancellingOrderId && (
        <CancellationModal
          role="buyer"
          orderId={cancellingOrderId}
          onClose={() => setCancellingOrderId(null)}
          onConfirm={cancelOrder}
          submitting={isCancelling}
        />
      )}
    </div>
  );
}

export default BuyerOrders;
